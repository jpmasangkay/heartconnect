const jwt = require('jsonwebtoken');
const { Message, Conversation } = require('./models/Conversation');
const User = require('./models/User');
const { checkSpam } = require('./middleware/spam');
const logger = require('./services/logger');

/**
 * Set up Socket.io on the given HTTP server.
 * Returns the io instance so it can be attached to app.locals.
 */
function setupSocket(server, opts = {}) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: opts.cors || { origin: true, methods: ['GET', 'POST'] },
    // Mobile networks / USB reverse can be jittery; make heartbeats more tolerant.
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ─── Socket Authentication ────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Per-socket rate limiting ─────────────────────────────────────────────
  const socketEventCounts = new Map();
  const SOCKET_RATE_WINDOW = 10000; // 10 s
  const SOCKET_RATE_MAX = 30;       // max events per window

  function isSocketRateLimited(socketId) {
    const now = Date.now();
    if (!socketEventCounts.has(socketId)) {
      socketEventCounts.set(socketId, []);
    }
    const events = socketEventCounts.get(socketId).filter((t) => now - t < SOCKET_RATE_WINDOW);
    events.push(now);
    socketEventCounts.set(socketId, events);
    return events.length > SOCKET_RATE_MAX;
  }

  // Cleanup every 30 s
  setInterval(() => {
    const cutoff = Date.now() - SOCKET_RATE_WINDOW;
    for (const [sid, events] of socketEventCounts) {
      const fresh = events.filter((t) => t > cutoff);
      if (fresh.length === 0) socketEventCounts.delete(sid);
      else socketEventCounts.set(sid, fresh);
    }
  }, 30000).unref();

  // ─── Online presence tracking ──────────────────────────────────────────────
  const onlineUsers = new Set();

  // ─── Connection Handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info('Socket connected', { userId: socket.userId });

    // Auto-join user-specific room
    socket.join(`user:${socket.userId}`);

    // Mark online
    onlineUsers.add(socket.userId);
    io.emit('user:online', { userId: socket.userId });

    // Join a conversation room
    socket.on('join_room', (conversationId) => {
      if (isSocketRateLimited(socket.id)) return;
      if (conversationId != null && conversationId !== '') {
        socket.join(String(conversationId));
      }
    });

    // Check if a user is online (request/response pattern)
    socket.on('get_online_status', async (targetUserId, callback) => {
      if (typeof callback !== 'function') return;
      const isOnline = onlineUsers.has(String(targetUserId));
      let lastSeen = null;
      if (!isOnline) {
        try {
          const u = await User.findById(targetUserId).select('lastSeen').lean();
          lastSeen = u?.lastSeen ?? null;
        } catch { /* noop */ }
      }
      callback({ online: isOnline, lastSeen });
    });

    // Receive and broadcast a message
    socket.on('send_message', async ({ conversationId, content }) => {
      try {
        if (isSocketRateLimited(socket.id)) return;

        // Validate input
        if (!content || typeof content !== 'string' || !content.trim() || content.length > 5000) return;
        const safeContent = content.trim();
        const convId = String(conversationId);
        const convo = await Conversation.findById(convId);
        const uid = String(socket.userId);
        if (!convo || !convo.participants.map((p) => String(p)).includes(uid)) return;

        // Block check: verify neither participant has blocked the other
        const sender = await User.findById(socket.userId);
        const otherParticipant = convo.participants.find((p) => String(p) !== uid);
        if (otherParticipant) {
          const other = await User.findById(otherParticipant);
          if (sender?.blockedUsers?.map(String).includes(String(otherParticipant)) ||
              other?.blockedUsers?.map(String).includes(uid)) {
            return;
          }
        }

        // Spam check
        const spamResult = checkSpam(uid, safeContent);
        if (spamResult.blocked) {
          socket.emit('message_error', { message: spamResult.reason });
          return;
        }

        const msg = await Message.create({
          conversation: convId,
          sender: socket.userId,
          content: safeContent,
        });
        await msg.populate('sender', 'name avatar');

        // Update conversation's lastMessage
        convo.lastMessage = msg._id;
        if (convo.hiddenFor?.length) convo.hiddenFor = [];
        await convo.save();

        // Broadcast
        io.to(convId).emit('receive_message', msg);
        for (const pid of convo.participants) {
          io.to(`user:${String(pid)}`).emit('receive_message', msg);
        }
      } catch (err) {
        logger.error('Socket send_message error', { error: err.message });
      }
    });

    // Typing indicator
    socket.on('typing', ({ conversationId, userId }) => {
      if (isSocketRateLimited(socket.id)) return;
      if (conversationId != null && conversationId !== '') {
        socket.to(String(conversationId)).emit('typing', { userId });
      }
    });

    socket.on('disconnect', async (reason) => {
      logger.info('Socket disconnected', { userId: socket.userId, reason });
      socketEventCounts.delete(socket.id);

      // Check if user has any other active sockets
      const sockets = await io.in(`user:${socket.userId}`).fetchSockets();
      if (sockets.length === 0) {
        onlineUsers.delete(socket.userId);
        // Persist lastSeen
        User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() }).catch(() => {});
        io.emit('user:offline', { userId: socket.userId, lastSeen: new Date() });
      }
    });
  });

  return io;
}

module.exports = { setupSocket };

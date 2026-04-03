const router  = require('express').Router();
const { Conversation, Message } = require('../models/Conversation');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const protect = require('../middleware/auth');
const { validateMessageInput } = require('../middleware/validation');
const { chatUpload } = require('../middleware/upload');
const { checkSpam } = require('../middleware/spam');
const logger = require('../services/logger');

// GET /api/conversations
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

    const filter = {
      participants: req.user._id,
      hiddenFor: { $nin: [req.user._id] },
    };
    const total = await Conversation.countDocuments(filter);
    logger.info('Conversations list requested', { userId: String(req.user?._id), total });
    const convos = await Conversation.find(filter)
      .populate('participants', 'name avatar role')
      .populate('job', 'title')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name' } })
      .sort({ updatedAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    // Single aggregation for all unread counts (replaces N+1 queries)
    const convoIds = convos.map((c) => c._id);
    const unreadCounts = await Message.aggregate([
      { $match: { conversation: { $in: convoIds }, sender: { $ne: req.user._id }, read: false } },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]);
    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));
    const data = convos.map((c) => ({
      ...c.toObject(),
      unreadCount: unreadMap.get(c._id.toString()) || 0,
    }));

    res.json({ data, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/unread
router.get('/unread', protect, async (req, res) => {
  try {
    const result = await Conversation.aggregate([
      { $match: { participants: req.user._id, hiddenFor: { $nin: [req.user._id] } } },
      { $lookup: {
          from: 'messages',
          let: { convoId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$conversation', '$$convoId'] },
              { $ne: ['$sender', req.user._id] },
              { $eq: ['$read', false] },
            ] } } },
          ],
          as: 'unread',
      }},
      { $group: { _id: null, count: { $sum: { $size: '$unread' } } } },
    ]);
    const count = result[0]?.count || 0;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// POST /api/conversations  (get or create)
router.post('/', protect, async (req, res) => {
  try {
    const { jobId, participantId } = req.body;
    
    // Validate job exists and user is authorized
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Block check
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(participantId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (currentUser.blockedUsers?.map(String).includes(participantId.toString()) ||
        targetUser.blockedUsers?.map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Cannot start conversation with this user' });
    }
    
    // Verify participant is either job client or applicant
    const isClientOrApplicant = 
      participantId.toString() === job.client._id.toString() ||
      await Application.findOne({ job: jobId, applicant: participantId });
    
    if (!isClientOrApplicant) {
      return res.status(403).json({ message: 'Not authorized to create conversation' });
    }
    
    const participants = [req.user._id, participantId].sort();

    let convo = await Conversation.findOne({ job: jobId, participants: { $all: participants } });
    if (!convo) {
      convo = await Conversation.create({ participants, job: jobId });
    } else {
      // Ensure it shows for both parties if previously hidden
      if (convo.hiddenFor?.length) {
        convo.hiddenFor = [];
        await convo.save();
      }
    }
    await convo.populate([
      { path: 'participants', select: 'name avatar role' },
      { path: 'job', select: 'title' },
    ]);

    const io = req.app.locals.io;
    if (io) {
      const base = convo.toObject();
      for (const p of convo.participants) {
        const pidStr = p._id != null ? String(p._id) : String(p);
        const unreadCount = await Message.countDocuments({
          conversation: convo._id,
          sender: { $ne: p._id ?? p },
          read: false,
        });
        io.to(`user:${pidStr}`).emit('conversation:new', { ...base, unreadCount });
      }
    }

    res.status(201).json(convo);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create conversation' });
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.participants.map(String).includes(String(req.user._id)))
      return res.status(403).json({ message: 'Not a participant' });

    const { page = 1, limit = 50 } = req.query;
    const safePage  = Math.max(1, Math.min(Number(page)  || 1,  1000));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));

    const filter = { conversation: convo._id };
    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean();
    // Return in chronological order
    messages.reverse();
    res.json({ data: messages, total, pages: Math.ceil(total / safeLimit), page: safePage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// POST /api/conversations/:id/messages  — text or file message
router.post('/:id/messages', protect, chatUpload.single('file'), async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.participants.map(String).includes(String(req.user._id)))
      return res.status(403).json({ message: 'Not a participant' });

    // Block check
    const uid = req.user._id.toString();
    const otherPid = convo.participants.find((p) => String(p) !== uid);
    if (otherPid) {
      const sender = await User.findById(req.user._id);
      const other = await User.findById(otherPid);
      if (sender?.blockedUsers?.map(String).includes(String(otherPid)) ||
          other?.blockedUsers?.map(String).includes(uid)) {
        return res.status(403).json({ message: 'Cannot send message to this user' });
      }
    }

    const content = req.body.content || '';

    // Must have either content or a file
    if (!content.trim() && !req.file) {
      return res.status(400).json({ message: 'Message content or file is required' });
    }

    // Validate text content if present
    if (content.trim()) {
      const validation = validateMessageInput(content);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }
      // Spam check
      const spamResult = checkSpam(uid, content.trim());
      if (spamResult.blocked) {
        return res.status(429).json({ message: spamResult.reason });
      }
    }

    const msgData = {
      conversation: convo._id,
      sender: req.user._id,
      content: content.trim(),
    };

    // Attach file info if uploaded
    if (req.file) {
      msgData.fileUrl  = `/uploads/chat/${req.file.filename}`;
      msgData.fileName = req.file.originalname;
      msgData.fileType = req.file.mimetype;
      msgData.fileSize = req.file.size;
    }

    const msg = await Message.create(msgData);
    convo.lastMessage = msg._id;
    if (convo.hiddenFor?.length) convo.hiddenFor = [];
    await convo.save();

    await msg.populate('sender', 'name avatar');

    // Broadcast to participant user rooms only (no conversation-room emit to avoid duplicates)
    for (const pid of convo.participants) {
      const pidStr = String(pid);
      req.app.locals.io.to(`user:${pidStr}`).emit('receive_message', msg);
    }

    res.status(201).json(msg);
  } catch (err) {
    res.status(400).json({ message: 'Failed to send message' });
  }
});

// PATCH /api/conversations/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const result = await Message.updateMany(
      { conversation: req.params.id, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );

    // Notify the other participant that their messages were seen
    if (result.modifiedCount > 0) {
      const convo = await Conversation.findById(req.params.id).lean();
      if (convo) {
        const otherPid = convo.participants.find((p) => String(p) !== String(req.user._id));
        if (otherPid) {
          req.app.locals.io.to(`user:${String(otherPid)}`).emit('messages:read', {
            conversationId: req.params.id,
            readBy: req.user._id,
          });
        }
      }
    }

    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// DELETE /api/conversations/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    
    if (!convo.participants.map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this conversation' });
    }
    
    const participantIds = convo.participants.map(String);
    const convoId = convo._id.toString();
    const uid = req.user._id.toString();

    // Soft-delete (hide) for only this user.
    if (!convo.hiddenFor) convo.hiddenFor = [];
    if (!convo.hiddenFor.map(String).includes(uid)) {
      convo.hiddenFor.push(req.user._id);
      await convo.save();
    }

    // Notify only this user's room (all tabs/devices)
    req.app.locals.io.to(`user:${uid}`).emit('conversation:hidden', { _id: convoId });

    // If everyone hid it, actually delete from DB (optional cleanup).
    const hiddenSet = new Set(convo.hiddenFor.map(String));
    const allHidden = participantIds.every((pid) => hiddenSet.has(pid));
    if (allHidden) {
      await Message.deleteMany({ conversation: convo._id });
      await convo.deleteOne();
      for (const pid of participantIds) {
        req.app.locals.io.to(`user:${pid}`).emit('conversation:deleted', { _id: convoId });
      }
    }

    res.json({ message: 'Conversation hidden' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete conversation' });
  }
});

module.exports = router;

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Send, MessageSquare, ChevronLeft, Trash2, Paperclip, FileText, Image as ImageIcon, X, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow, format, isToday } from 'date-fns';
import { messagesApi } from '../api';
import { FadePresence } from '../components/ui/loading-fade';
import { Skeleton } from '../components/ui/skeleton';
import { bumpConversationToFront, byIdMap } from '../lib/collections';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useUnread } from '../context/UnreadContext';
import type { Conversation, Message, User } from '../types';



function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  return isToday(d) ? format(d, 'h:mm a') : format(d, 'MMM d, h:mm a');
}

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { socket, reconnecting } = useSocket();
  const { refreshUnread } = useUnread();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const refetchedUrlConvRef = useRef<string | null>(null);
  // Dedup: prevent the same socket message from being appended twice
  const seenMsgIdsRef = useRef<Set<string>>(new Set());

  const conversationsById = useMemo(() => byIdMap(conversations), [conversations]);

  // Refs mirror state so socket handlers read current values without re-registering listeners
  const activeConvRef = useRef(activeConv);
  activeConvRef.current = activeConv;
  const conversationsByIdRef = useRef(conversationsById);
  conversationsByIdRef.current = conversationsById;

  const MAX_SEEN_IDS = 500;
  const trackSeenId = useCallback((id: string) => {
    const set = seenMsgIdsRef.current;
    if (set.has(id)) return false;
    if (set.size >= MAX_SEEN_IDS) {
      const it = set.values();
      for (let i = 0; i < 100; i++) it.next();
      // Trim oldest 100 entries
      const keep = new Set<string>();
      for (const v of it) keep.add(v);
      seenMsgIdsRef.current = keep;
    }
    seenMsgIdsRef.current.add(id);
    return true;
  }, []);

  const otherParticipantByConvId = useMemo(() => {
    const m = new Map<string, User | undefined>();
    const uid = user?._id;
    for (const conv of conversations) {
      const parts = conv.participants;
      if (!parts?.length) {
        m.set(conv._id, undefined);
        continue;
      }
      const other = parts.find((p) => p._id !== uid) ?? parts[0];
      m.set(conv._id, other);
    }
    return m;
  }, [conversations, user?._id]);

  const scrollMessagesToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useLayoutEffect(() => {
    if (loadingMsgs) return;
    if (!stickToBottomRef.current) return;
    scrollMessagesToBottom();
  }, [loadingMsgs, messages, activeConv?._id, scrollMessagesToBottom]);

  // Reset all chat state when the logged-in user changes (e.g. logout → login on same tab)
  useEffect(() => {
    setConversations([]);
    setActiveConv(null);
    setMessages([]);
    setLoadingConvs(true);
    seenMsgIdsRef.current.clear();
  }, [user?._id]);

  // Load conversations — re-run whenever the user changes
  useEffect(() => {
    if (!user) return;
    const ac = new AbortController();
    const { signal } = ac;
    const t0 = Date.now();

    (async () => {
      try {
        const r = await messagesApi.getConversations({ signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        const convos = r.data.data ?? [];
        setConversations(convos);
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setConversations([]);
      } finally {
        if (!signal.aborted) setLoadingConvs(false);
      }
    })();

    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Merge conversation opened from Job Detail (API response) before list refetch completes
  useEffect(() => {
    const conv = (location.state as { conversation?: Conversation } | null)?.conversation;
    if (!conv?._id) return;
    const id = String(conv._id);
    setConversations((prev) => {
      if (prev.some((c) => String(c._id) === id)) return prev;
      return [{ ...conv, unreadCount: conv.unreadCount ?? 0 }, ...prev];
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  // If URL points at a conversation not in the loaded list, refetch once (e.g. other tab or missed socket)
  useEffect(() => {
    if (!conversationId || loadingConvs || !user) return;
    if (conversationsById.has(conversationId)) {
      refetchedUrlConvRef.current = null;
      return;
    }
    if (refetchedUrlConvRef.current === conversationId) return;
    refetchedUrlConvRef.current = conversationId;
    void messagesApi.getConversations().then((r) => {
      setConversations(r.data.data ?? []);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loadingConvs, conversationsById, user?._id]);

  // Select conversation from URL param (O(1) map lookup)
  useEffect(() => {
    if (!conversationId) {
      setActiveConv(null);
      return;
    }
    const conv = conversationsById.get(conversationId);
    // Don't reset `activeConv` on every conversations list update (it would re-trigger message loading + skeleton).
    setActiveConv((prev) => {
      if (!conv) return prev;
      if (prev && String(prev._id) === String(conversationId)) return prev;
      return conv;
    });
  }, [conversationId, conversationsById]);

  // Load messages when active conv changes
  useEffect(() => {
    if (!activeConv?._id) return;
    const ac = new AbortController();
    const { signal } = ac;
    const convId = activeConv._id;
    stickToBottomRef.current = true;
    setLoadingMsgs(true);
    setMessages([]);
    const t0 = Date.now();

    (async () => {
      try {
        const r = await messagesApi.getMessages(convId, { signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        const msgs = r.data.data ?? [];
        setMessages(msgs);
        for (const m of msgs) trackSeenId(m._id);
        // Auto-mark as read immediately when opening a conversation
        void messagesApi.markRead(convId).then(() => refreshUnread()).catch(() => {});
        // Clear the unread badge for this conversation in the sidebar
        setConversations((prev) =>
          prev.map((c) => String(c._id) === convId ? { ...c, unreadCount: 0 } : c)
        );
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setMessages([]);
      } finally {
        if (!signal.aborted) setLoadingMsgs(false);
      }
    })();

    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?._id]);

  // Socket event listeners — uses refs so this effect only re-runs when socket/user changes
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: Message) => {
      if (!msg?._id) return;

      // Deduplicate: skip if we've already processed this message ID
      if (!trackSeenId(msg._id)) return;

      const convId =
        typeof msg.conversation === 'string'
          ? msg.conversation
          : String((msg.conversation as { _id?: string })?._id ?? msg.conversation);

      const currentActiveConv = activeConvRef.current;
      const isActive = currentActiveConv && String(currentActiveConv._id) === String(convId);

      if (isActive) {
        setMessages((prev) => {
          // Remove optimistic placeholder if it matches
          const filtered = prev.filter(
            (m) =>
              !(
                m._id.startsWith('opt-') &&
                m.sender._id === msg.sender._id &&
                m.content === msg.content
              ),
          );
          // Prevent true duplicates (same _id already in the array)
          if (filtered.some((m) => m._id === msg._id)) return filtered;
          return [...filtered, msg];
        });

        if (msg.sender._id !== user?._id) {
          void messagesApi.markRead(convId).then(() => refreshUnread());
        }

        setConversations((prev) =>
          prev.map(c => String(c._id) === String(convId) ? { ...c, unreadCount: 0 } : c)
        );

        stickToBottomRef.current = true;
      }

      setConversations((prev) => {
        let list = bumpConversationToFront(prev, convId, msg.createdAt);
        if (!isActive && msg.sender._id !== user?._id) {
          list = list.map(c => String(c._id) === String(convId) ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c);
        }
        return list;
      });

      if (!conversationsByIdRef.current.has(String(convId))) {
        void messagesApi.getConversations().then((r) => {
          setConversations(r.data.data ?? []);
        }).catch(() => {});
      }
    };

    const handleReconnect = () => {
      setActiveConv((currentConv) => {
        if (currentConv) socket.emit('join_room', String(currentConv._id));
        return currentConv;
      });
    };

    const handleConversationNew = (conv: Conversation) => {
      const id = String(conv._id);
      setConversations((prev) => {
        const i = prev.findIndex((c) => String(c._id) === id);
        if (i === -1) return [{ ...conv, unreadCount: conv.unreadCount ?? 0 }, ...prev];
        const next = prev.slice();
        next[i] = { ...next[i], ...conv, unreadCount: conv.unreadCount ?? next[i].unreadCount };
        return next;
      });
      refreshUnread();
    };

    const handleTyping = ({ userId }: { userId: string }) => {
      if (userId !== user?._id) setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    };

    const handleConvoDeleted = ({ _id }: { _id: string }) => {
      setConversations((prev) => prev.filter((c) => c._id !== _id));
      setActiveConv((prev) => {
        if (prev && prev._id === _id) {
          navigate('/chat', { replace: true });
          return null;
        }
        return prev;
      });
    };

    const handleConvoHidden = ({ _id }: { _id: string }) => {
      setConversations((prev) => prev.filter((c) => c._id !== _id));
      setActiveConv((prev) => {
        if (prev && prev._id === _id) {
          navigate('/chat', { replace: true });
          return null;
        }
        return prev;
      });
      refreshUnread();
    };

    const handleMessagesRead = ({ conversationId }: { conversationId: string }) => {
      const cur = activeConvRef.current;
      if (cur && String(cur._id) === conversationId) {
        setMessages((prev) => prev.map((m) => m.sender._id === user?._id ? { ...m, read: true } : m));
      }
    };

    socket.on('receive_message', handleMessage);
    socket.on('connect', handleReconnect);
    socket.on('typing', handleTyping);
    socket.on('conversation:deleted', handleConvoDeleted);
    socket.on('conversation:hidden', handleConvoHidden);
    socket.on('conversation:new', handleConversationNew);
    socket.on('messages:read', handleMessagesRead);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('connect', handleReconnect);
      socket.off('typing', handleTyping);
      socket.off('conversation:deleted', handleConvoDeleted);
      socket.off('conversation:hidden', handleConvoHidden);
      socket.off('conversation:new', handleConversationNew);
      socket.off('messages:read', handleMessagesRead);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user?._id, navigate, refreshUnread, trackSeenId]);

  // Stable key of other-participant IDs so presence polling only re-runs when the
  // set of chat partners actually changes (not on every message / unread bump).
  const otherParticipantIdsKey = useMemo(() => {
    if (!user) return '';
    const ids = new Set<string>();
    for (const conv of conversations) {
      const other = conv.participants?.find((p) => p._id !== user._id);
      if (other?._id) ids.add(other._id);
    }
    return [...ids].sort().join(',');
  }, [conversations, user]);

  // On-demand online-presence polling via get_online_status (replaces removed user:online/user:offline broadcasts)
  useEffect(() => {
    if (!socket || !otherParticipantIdsKey) return;

    const otherIds = otherParticipantIdsKey.split(',');

    const queryAll = () => {
      for (const uid of otherIds) {
        socket.emit('get_online_status', uid, (res: { online: boolean; lastSeen: string | null }) => {
          if (res.online) {
            setOnlineUsers((prev) => { if (prev.has(uid)) return prev; const next = new Set(prev); next.add(uid); return next; });
          } else {
            setOnlineUsers((prev) => { if (!prev.has(uid)) return prev; const next = new Set(prev); next.delete(uid); return next; });
          }
          if (res.lastSeen) {
            setLastSeenMap((prev) => { if (prev.get(uid) === res.lastSeen) return prev; const next = new Map(prev); next.set(uid, res.lastSeen!); return next; });
          }
        });
      }
    };

    queryAll();
    const interval = setInterval(queryAll, 60_000); // Refresh every 60 s
    // Also re-query on reconnect
    socket.on('connect', queryAll);
    return () => {
      clearInterval(interval);
      socket.off('connect', queryAll);
    };
  }, [socket, otherParticipantIdsKey]);

  // Join room when active conv changes; re-join after reconnect (rooms are not preserved)
  useEffect(() => {
    if (!socket || !activeConv) return;
    const roomId = String(activeConv._id);
    const join = () => {
      socket.emit('join_room', roomId);
    };
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [socket, activeConv]);

  const handleSelectConv = (conv: Conversation) => {
    setActiveConv(conv);
    navigate(`/chat/${conv._id}`, { replace: true });
    // Clear unread badge and refresh global count
    refreshUnread();
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || !user) return;
    const content = input.trim();
    setInput('');
    stickToBottomRef.current = true;

    // Optimistic update
    const optimistic: Message = {
      _id: `opt-${Date.now()}`,
      conversation: activeConv._id,
      sender: user!,
      content,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    if (socket?.connected) {
      socket.emit('send_message', {
        conversationId: String(activeConv._id),
        content,
      });
    } else {
      // Fallback: socket unavailable, save via REST API directly
      try {
        const res = await messagesApi.sendMessage(activeConv._id, content);
        // Replace optimistic message with the real one returned by the server
        setMessages((prev) =>
          prev.map((m) => (m._id === optimistic._id ? res.data : m))
        );
      } catch {
        // Remove the optimistic message if REST also fails
        setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      }
    }
  };

  const handleTyping = () => {
    if (activeConv && socket) {
      socket.emit('typing', { conversationId: String(activeConv._id), userId: user?._id });
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendFile = async () => {
    if (!pendingFile || !activeConv) return;
    setUploadingFile(true);
    stickToBottomRef.current = true;
    try {
      await messagesApi.sendFileMessage(activeConv._id, pendingFile, input.trim() || undefined);
      // Don't append manually — the socket 'receive_message' event will deliver it
      setPendingFile(null);
      setInput('');
    } catch {
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const IMAGE_EXTS = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
  const isImageFile = (type?: string, name?: string) =>
    type?.startsWith('image/') || (name ? IMAGE_EXTS.test(name) : false);

  const getFileUrl = (url?: string) => {
    if (!url) return '';
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return url.startsWith('http') ? url : `${base}${url}`;
  };

  const handleDeleteConversation = async () => {
    if (!activeConv) return;
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }
    try {
      await messagesApi.deleteConversation(activeConv._id);
      setConversations((prev) => prev.filter((c) => c._id !== activeConv._id));
      setActiveConv(null);
      navigate('/chat');
    } catch {
      alert('Failed to delete conversation');
    }
  };

  const otherFor = useCallback(
    (conv: Conversation) => otherParticipantByConvId.get(conv._id),
    [otherParticipantByConvId],
  );

  return (
    <div className="h-[calc(100dvh-64px)] bg-cream flex flex-col overflow-hidden">
      <main className="flex-1 max-w-6xl mx-auto w-full p-0 md:p-4 overflow-hidden">
        <div className="bg-white border-0 md:border border-stone-border md:rounded-sm overflow-hidden flex flex-col h-full">
          {/* Reconnecting banner */}
          {reconnecting && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-700 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Reconnecting to server…
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">

          {/* ── Conversation list ────────────────────────────────────────── */}
          <div className={`w-full md:w-72 border-r border-stone-border flex flex-col shrink-0 ${activeConv ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-border">
              <h2 className="font-bold text-sm">Messages</h2>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              <FadePresence
                activeKey={
                  loadingConvs ? 'loading' : conversations.length === 0 ? 'empty' : 'list'
                }
              >
                {loadingConvs ? (
                  <div className="divide-y divide-stone-border" aria-busy="true" aria-label="Loading conversations">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 flex gap-3 items-start">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0 pt-0.5">
                          <Skeleton className="h-3.5 w-[78%] rounded" />
                          <Skeleton className="h-3 w-full rounded" />
                          <Skeleton className="h-2.5 w-24 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 text-center">
                    <MessageSquare size={28} className="text-stone-300 mb-3" />
                    <p className="text-sm text-stone-muted">No conversations yet.</p>
                    {user?.role === 'student' && (
                      <Link to="/jobs" className="mt-2 text-xs text-accent hover:underline">
                        Apply to a job to start chatting
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-stone-border">
                    {conversations.map((conv) => {
                      const other = otherFor(conv);
                      const isActive = activeConv?._id === conv._id;
                      return (
                        <button
                          key={conv._id}
                          onClick={() => handleSelectConv(conv)}
                          className={`w-full text-left px-5 py-4 transition-colors flex gap-3 items-start ${
                            isActive ? 'bg-cream' : 'hover:bg-cream-dark'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {other?.name.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-sm font-semibold truncate">{other?.name}</span>
                              {(conv.unreadCount ?? 0) > 0 && (
                                <span className="bg-navy text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-muted truncate mt-0.5">
                              {conv.job?.title ?? 'Job no longer available'}
                            </p>
                            <p className="text-xs text-stone-muted mt-0.5">
                              {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                            </p>
                            {/* Seen / Online / Last online */}
                            {(() => {
                              const otherId = other?._id;
                              if (!otherId) return null;
                              if (onlineUsers.has(otherId)) {
                                return <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Online</p>;
                              }
                              const ls = lastSeenMap.get(otherId);
                              if (ls) {
                                return <p className="text-[10px] text-stone-muted mt-0.5">Last online {formatDistanceToNow(new Date(ls), { addSuffix: true })}</p>;
                              }
                              return null;
                            })()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </FadePresence>
            </div>
          </div>

          {/* ── Message pane ─────────────────────────────────────────────── */}
          <div className={`flex-1 flex flex-col ${!activeConv ? 'hidden md:flex' : 'flex'}`}>
            {!activeConv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageSquare size={36} className="text-stone-300 mb-4" />
                <p className="text-sm text-stone-muted">Select a conversation to start messaging</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-3 md:px-6 py-3 md:py-4 border-b border-stone-border flex items-center justify-between gap-2 md:gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActiveConv(null); navigate('/chat'); }}
                      className="md:hidden text-stone-muted hover:text-navy transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold">
                      {otherFor(activeConv)?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{otherFor(activeConv)?.name}</p>
                      <p className="text-xs text-stone-muted truncate max-w-[140px] md:max-w-xs">
                        {activeConv.job?.title ?? 'Job no longer available'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteConversation}
                    className="text-stone-muted hover:text-red-600 transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Messages — single scroll container (no inner FadePresence) so scroll position is not reset */}
                <div
                  ref={messagesScrollRef}
                  onScroll={() => {
                    const el = messagesScrollRef.current;
                    if (!el) return;
                    const threshold = 100;
                    stickToBottomRef.current =
                      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
                  }}
                  className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-5 space-y-3 md:space-y-4"
                >
                  {loadingMsgs ? (
                    <div className="space-y-3 min-h-[120px]" aria-busy="true" aria-label="Loading messages">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                          <Skeleton
                            className={`rounded-lg ${i % 2 === 0 ? 'h-11 w-[min(100%,14rem)]' : 'h-11 w-[min(100%,18rem)]'}`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                      <p className="text-sm text-stone-muted">
                        No messages yet. Say hello!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.sender._id === user?._id;
                        return (
                          <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                              {!isMe && (
                                <span className="text-xs text-stone-muted ml-1">{msg.sender.name}</span>
                              )}
                              <div
                                className={`px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                                  isMe
                                    ? 'bg-navy text-white rounded-br-sm'
                                    : 'bg-cream border border-stone-border text-foreground rounded-bl-sm'
                                }`}
                              >
                                {/* File/image attachment */}
                                {msg.fileUrl && (
                                  isImageFile(msg.fileType, msg.fileName) ? (
                                    <button
                                      type="button"
                                      onClick={() => setLightboxUrl(getFileUrl(msg.fileUrl))}
                                      className="block"
                                    >
                                      <img
                                        src={getFileUrl(msg.fileUrl)}
                                        alt={msg.fileName || 'Image'}
                                        className="max-w-[240px] max-h-[200px] rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    </button>
                                  ) : (
                                    <a
                                      href={getFileUrl(msg.fileUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 mb-2 text-xs font-medium px-3 py-2 rounded ${
                                        isMe
                                          ? 'bg-white/15 hover:bg-white/25 text-white'
                                          : 'bg-white hover:bg-cream-dark text-foreground border border-stone-border'
                                      } transition-colors`}
                                    >
                                      <FileText size={14} />
                                      <span className="truncate max-w-[180px]">{msg.fileName || 'File'}</span>
                                      {msg.fileSize && (
                                        <span className="opacity-60 shrink-0">
                                          ({(msg.fileSize / 1024).toFixed(0)} KB)
                                        </span>
                                      )}
                                    </a>
                                  )
                                )}
                                {msg.content && <span>{msg.content}</span>}
                              </div>
                              <span className="text-[10px] text-stone-muted px-1 inline-flex items-center gap-1">
                                {formatMsgTime(msg.createdAt)}
                                {isMe && (
                                  msg.read
                                    ? <CheckCheck size={12} className="text-blue-400" />
                                    : <Check size={12} className="text-white/50" />
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Typing + input — anchored to bottom so indicator sits by the textbox */}
                <div className="shrink-0 border-t border-stone-border bg-white">
                  {isTyping && (
                    <div className="px-3 md:px-6 pt-3 pb-1">
                      <div className="flex items-center gap-2 text-xs text-stone-muted">
                        <div className="flex gap-1" aria-hidden>
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{otherFor(activeConv)?.name} is typing...</span>
                      </div>
                    </div>
                  )}
                  <div className={`px-3 md:px-6 ${isTyping ? 'pb-3 md:pb-4 pt-1' : 'py-3 md:py-4'}`}>
                  {/* File preview bar */}
                  {pendingFile && (
                    <div className="flex items-center gap-2 px-3 md:px-6 py-2 bg-cream border-b border-stone-border">
                      {pendingFile.type.startsWith('image/') ? (
                        <ImageIcon size={14} className="text-navy shrink-0" />
                      ) : (
                        <FileText size={14} className="text-navy shrink-0" />
                      )}
                      <span className="text-xs text-foreground truncate flex-1">{pendingFile.name}</span>
                      <span className="text-[10px] text-stone-muted">
                        {(pendingFile.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={() => setPendingFile(null)}
                        className="text-stone-muted hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={pendingFile ? (e) => { e.preventDefault(); handleSendFile(); } : handleSend} className="flex gap-2 md:gap-3 items-center">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.zip"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 text-stone-muted hover:text-navy transition-colors flex items-center justify-center shrink-0"
                      title="Attach file"
                    >
                      <Paperclip size={16} />
                    </button>
                    <input
                      value={input}
                      onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                      placeholder={pendingFile ? 'Add a caption (optional)...' : 'Type a message...'}
                      className="flex-1 min-w-0 bg-cream border border-stone-border rounded-lg px-3 md:px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={(!input.trim() && !pendingFile) || uploadingFile}
                      className="w-10 h-10 bg-navy hover:bg-navy-light text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </main>

      {/* Image lightbox modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl"
            onClick={() => setLightboxUrl(null)}
          >
            ×
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

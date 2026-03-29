import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { messagesApi } from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import type { Message } from '../types';

interface UnreadContextValue {
  unreadCount: number;
  refreshUnread: () => void;
}

const UnreadContext = createContext<UnreadContextValue>({ unreadCount: 0, refreshUnread: () => {} });

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) { setUnreadCount(0); return; }
    try {
      const res = await messagesApi.getUnreadCount();
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // silently fail
    }
  }, [isAuthenticated]);

  // Clear seen-message cache whenever the logged-in user changes to prevent cross-session accumulation
  useEffect(() => {
    seenMessageIdsRef.current.clear();
  }, [user?._id]);

  // Initial fetch on auth change
  useEffect(() => {
    refreshUnread();
  }, [isAuthenticated, refreshUnread]);

  // Real-time: bump count when a new message arrives (unless the user is
  // actively viewing that conversation — Chat.tsx calls refreshUnread after markRead)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      // Avoid double-counting: we may receive the same message via both user-room + conversation-room emits.
      if (!msg?._id) return;
      if (seenMessageIdsRef.current.has(msg._id)) return;
      seenMessageIdsRef.current.add(msg._id);

      // Don't count messages you sent.
      if (msg.sender?._id && user?._id && String(msg.sender._id) === String(user._id)) return;

      setUnreadCount((prev) => prev + 1);
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('conversation:deleted', refreshUnread);
    socket.on('conversation:hidden', refreshUnread);
    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('conversation:deleted', refreshUnread);
      socket.off('conversation:hidden', refreshUnread);
    };
  }, [socket, refreshUnread, user?._id]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}

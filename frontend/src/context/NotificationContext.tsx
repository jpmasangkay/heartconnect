import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { notificationsApi } from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => void;
  refreshUnreadCount: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(() => {
    if (!isAuthenticated) return;
    notificationsApi.getUnreadCount()
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {});
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    notificationsApi.getAll(1)
      .then((res) => {
        setNotifications(res.data.data);
        // Also refresh count
        refreshUnreadCount();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, refreshUnreadCount]);

  // Load on mount if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refreshUnreadCount();
  }, [isAuthenticated, refreshUnreadCount]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNew = () => {
      refreshUnreadCount();
      refreshNotifications();
    };

    socket.on('notification:new', handleNew);
    return () => { socket.off('notification:new', handleNew); };
  }, [socket, isAuthenticated, refreshUnreadCount, refreshNotifications]);

  const markRead = useCallback(async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refreshNotifications, refreshUnreadCount, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  reconnecting: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  /** Must be state (not ref) so consumers re-render as soon as `io()` exists — otherwise `join_room` never runs until `connect`, and context still had `socket: null`. */
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 300,
      reconnectionDelayMax: 3000,
    });

    setSocket(s);

    const onConnect = () => { setConnected(true); setReconnecting(false); };
    const onDisconnect = () => setConnected(false);
    const onReconnecting = () => setReconnecting(true);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.io.on('reconnect_attempt', onReconnecting);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.io.off('reconnect_attempt', onReconnecting);
      s.disconnect();
      setSocket(null);
      setConnected(false);
      setReconnecting(false);
    };
  }, [token]);

  const value = useMemo(() => ({ socket, connected, reconnecting }), [socket, connected, reconnecting]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

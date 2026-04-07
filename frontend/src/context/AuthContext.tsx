import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../api';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import type { User, LoginCredentials, RegisterData, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  /** In-memory token used exclusively for Socket.io handshake. Never stored in localStorage. */
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    const initAuth = async () => {
      const t0 = Date.now();
      try {
        const response = await authApi.getMe({ signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        const { socketToken, ...userData } = response.data;
        setUser(userData as User);
        setToken(socketToken ?? null);
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setUser(null);
        setToken(null);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    void initAuth();
    return () => ac.abort();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const res = await authApi.login(credentials);
    const data = res.data;

    if (data.requires2FA) {
      return data;
    }

    setToken(data.token || null);
    setUser(data.user || null);
    return data;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await authApi.register(data);
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore — cookie may already be expired
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

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

  // Initialize from cookie/API on mount
  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    const initAuth = async () => {
      const t0 = Date.now();
      try {
        const storedToken = localStorage.getItem('token');
        const response = await authApi.getMe({ signal });
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        setUser(response.data);
        setToken(storedToken);
      } catch {
        await waitMinSkeletonMs(t0, signal);
        if (signal.aborted) return;
        // If login() finished while this getMe was in flight, a token may exist now — do not wipe it.
        const tokenAfter = localStorage.getItem('token');
        if (tokenAfter) {
          try {
            const response = await authApi.getMe({ signal });
            if (signal.aborted) return;
            setUser(response.data);
            setToken(tokenAfter);
          } catch {
            if (signal.aborted) return;
            localStorage.removeItem('token');
            setUser(null);
            setToken(null);
          }
        } else {
          localStorage.removeItem('token');
          setUser(null);
          setToken(null);
        }
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

    // If 2FA is required, return the challenge info without setting user/token
    if (data.requires2FA) {
      return data;
    }

    // Normal login
    if (data.token) localStorage.setItem('token', data.token);
    setToken(data.token || null);
    setUser(data.user || null);
    return data;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await authApi.register(data);
    const { token: t, user: u } = res.data;
    if (t) localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    // Hit server first while cookies / headers are still valid so httpOnly cookie can clear.
    try {
      await authApi.logout();
    } catch {
      // Ignore network / server errors
    }
    localStorage.removeItem('token');
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
        isAuthenticated: !!token && !!user,
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

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

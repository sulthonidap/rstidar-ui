import { isAxiosError } from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { TOKEN_STORAGE_KEY, api, apiErrorMessage, clearToken, getToken, setToken } from './api';
import { markExpiredOnStart, setLoggedOut } from './session';
import type { User } from '../types/models';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      // No automatic redirect here: this also runs on the public pages (order
      // form, tracking), where a stale staff token must not bounce the visitor.
      const { data } = await api.get<{ data: User }>('/auth/me', { skipAuthRedirect: true });
      setUser(data.data);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) markExpiredOnStart();
      clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // Another tab logged out (token removed) or logged in, maybe as someone else
  // (token replaced): follow it, so every tab shows the same account.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_STORAGE_KEY && e.key !== null) return;
      if (!getToken()) {
        setLoggedOut(true);
        setUser(null);
        return;
      }
      setLoggedOut(false);
      void loadMe();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
      setToken(data.token);
      setLoggedOut(false);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Login gagal'));
    }
  }, []);

  const logout = useCallback(() => {
    setLoggedOut(true);
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}

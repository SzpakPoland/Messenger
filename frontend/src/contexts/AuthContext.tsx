'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: FormData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const saveToken = useCallback((t: string | null) => {
    setToken(t);
    if (t) {
      localStorage.setItem('gk_token', t);
    } else {
      localStorage.removeItem('gk_token');
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('gk_token');
    if (stored) {
      authAPI
        .me()
        .then((res) => {
          setUser(res.data.user);
          setToken(stored);
        })
        .catch(() => {
          localStorage.removeItem('gk_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authAPI.login({ username, password });
      setUser(res.data.user);
      saveToken(res.data.token);
    },
    [saveToken]
  );

  const register = useCallback(
    async (data: FormData) => {
      const res = await authAPI.register(data);
      setUser(res.data.user);
      saveToken(res.data.token);
    },
    [saveToken]
  );

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
    }
    setUser(null);
    saveToken(null);
    router.push('/login');
  }, [router, saveToken]);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

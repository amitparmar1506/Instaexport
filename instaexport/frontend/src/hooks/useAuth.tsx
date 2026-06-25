'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  full_name: string;
  profile_picture: string;
  plan: 'free' | 'pro';
  pro_expires_at: string | null;
  total_comments_exported: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('ie_token');
    if (!token) {
      setIsLoading(false);
      setUser(null);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch (err: any) {
      // Only clear token on explicit 401 — not on network errors
      if (err?.response?.status === 401) {
        localStorage.removeItem('ie_token');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem('ie_token', token);
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('ie_token');
    setUser(null);
    window.location.href = '/';
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

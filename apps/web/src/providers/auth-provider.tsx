'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiClient } from '@/lib/api-client';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type StoredAuthSession,
} from '@/lib/storage';
import { AuthenticatedUser, LoginResponse } from '@/types/auth';

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ['/auth/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const nextSession = getStoredSession();
    setSession(nextSession);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (!session && !isPublicPath) {
      router.replace('/auth/login');
      return;
    }

    if (session && pathname === '/auth/login') {
      router.replace('/dashboard');
    }
  }, [isLoading, pathname, router, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session?.accessToken),
      isLoading,
      accessToken: session?.accessToken ?? null,
      user: session?.user ?? null,
      async login(email: string, password: string) {
        const response = await apiClient.post<LoginResponse>('/auth/login', {
          email,
          password,
        });

        const nextSession: StoredAuthSession = {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
        };

        setStoredSession(nextSession);
        setSession(nextSession);
        router.replace('/dashboard');
      },
      logout() {
        clearStoredSession();
        setSession(null);
        router.replace('/auth/login');
      },
      hasPermission(permission: string) {
        return session?.user.permissions.includes(permission) ?? false;
      },
    }),
    [isLoading, router, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider.');
  }

  return context;
}

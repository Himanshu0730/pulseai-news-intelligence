import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateInterests: (interests: string[]) => Promise<void>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pulse_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // When login()/register() succeed we already have the fresh user payload, so
  // the token-change effect must not fire a redundant /auth/me round-trip.
  const skipSessionCheckRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser(attempt: number = 0) {
      if (skipSessionCheckRef.current) {
        skipSessionCheckRef.current = false;
        setIsLoading(false);
        return;
      }

      if (!token) {
        const t0 = performance.now();
        console.log(`[perf] Auth Init ${Math.round(performance.now() - t0)}ms (no session)`);
        setIsLoading(false);
        return;
      }

      const t0 = performance.now();
      try {
        const data = await api.get<{ user: User }>('/auth/me');
        if (cancelled) return;
        console.log(`[perf] Auth Init ${Math.round(performance.now() - t0)}ms (session restored)`);
        setUser(data.user);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;

        // Only a real 401 means the token is invalid/expired — log out then.
        if (err instanceof ApiError && err.status === 401) {
          console.warn('Session expired or invalid token', err);
          localStorage.removeItem('pulse_token');
          setToken(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Transient network/server failure: retry a couple of times before giving up,
        // and keep the user logged in so a flaky connection doesn't drop the session.
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
          if (cancelled) return;
          return loadCurrentUser(attempt + 1);
        }

        console.warn('Could not verify session (network error), keeping login state', err);
        setIsLoading(false);
      }
    }

    loadCurrentUser(0);

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Keep the whole app in sync when any request receives a 401 (expired session).
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
      openAuthModal('login');
    };

    window.addEventListener('pulse:session-expired', handleSessionExpired);
    return () => window.removeEventListener('pulse:session-expired', handleSessionExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ user: User; token: string }>('/auth/login', { email, password });
    localStorage.setItem('pulse_token', data.token);
    skipSessionCheckRef.current = true;
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api.post<{ user: User; token: string }>('/auth/register', { email, password, name });
    localStorage.setItem('pulse_token', data.token);
    skipSessionCheckRef.current = true;
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('pulse_token');
    setToken(null);
    setUser(null);
  };

  const updateInterests = async (newInterests: string[]) => {
    if (!user) return;
    const data = await api.put<{ interests: string[] }>('/users/interests', { interests: newInterests });
    setUser((prev) => (prev ? { ...prev, interests: data.interests } : null));
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateInterests,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

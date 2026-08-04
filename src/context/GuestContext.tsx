import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from './AuthContext';

interface GuestUsageState {
  date: string;
  articlesOpened: number;
  searchesPerformed: number;
  aiRequestsPerformed: number;
}

interface GuestContextType {
  isGuest: boolean;
  trialSecondsRemaining: number;
  isTrialExpired: boolean;
  resetTrialTimer: () => void;
  setDashboardActive: (active: boolean) => void;
  articlesOpened: number;
  articlesLimit: number;
  articlesRemaining: number;
  searchesPerformed: number;
  searchesLimit: number;
  searchesRemaining: number;
  aiRequestsPerformed: number;
  aiLimit: number;
  aiRemaining: number;
  recordArticleOpen: (articleId: string) => Promise<boolean>;
  recordSearch: () => boolean;
  recordAiRequest: () => boolean;
  refreshGuestStatus: () => Promise<void>;
  showLimitNotice: boolean;
  limitNoticeMessage: string;
  dismissLimitNotice: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'pulse_guest_usage_v1';
const TRIAL_DURATION_SECONDS = 30;

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, openAuthModal } = useAuth();
  const isGuest = !user;

  const [articlesLimit, setArticlesLimit] = useState(10);
  const [searchesLimit, setSearchesLimit] = useState(5);
  const [aiLimit, setAiLimit] = useState(3);

  // 30-second trial countdown state
  const [trialSecondsRemaining, setTrialSecondsRemaining] = useState<number>(TRIAL_DURATION_SECONDS);
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [isDashboardActive, setIsDashboardActive] = useState<boolean>(false);

  const [usage, setUsage] = useState<GuestUsageState>(() => {
    try {
      const today = getTodayStr();
      const saved = localStorage.getItem(GUEST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return {
      date: getTodayStr(),
      articlesOpened: 0,
      searchesPerformed: 0,
      aiRequestsPerformed: 0,
    };
  });

  const [showLimitNotice, setShowLimitNotice] = useState(false);
  const [limitNoticeMessage, setLimitNoticeMessage] = useState('');

  // Manage 30-second trial timer (only active on dashboard)
  useEffect(() => {
    if (!isGuest || !isDashboardActive) {
      return;
    }

    if (trialSecondsRemaining <= 0) {
      setIsTrialExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTrialSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTrialExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGuest, isDashboardActive, trialSecondsRemaining]);

  const resetTrialTimer = () => {
    setTrialSecondsRemaining(TRIAL_DURATION_SECONDS);
    setIsTrialExpired(false);
  };

  // Persist usage state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(usage));
    } catch {
      // Ignore storage errors
    }
  }, [usage]);

  // Sync with server guest status
  const refreshGuestStatus = async () => {
    if (!isGuest) return;
    try {
      const data = await api.get<{
        articlesOpened: number;
        articlesLimit: number;
        articlesRemaining: number;
        searchesPerformed: number;
        searchesLimit: number;
        searchesRemaining: number;
        aiRequestsPerformed: number;
        aiLimit: number;
        aiRemaining: number;
      }>('/news/guest/status');

      if (data) {
        setArticlesLimit(data.articlesLimit || 10);
        setSearchesLimit(data.searchesLimit || 5);
        setAiLimit(data.aiLimit || 3);
        setUsage((prev) => ({
          ...prev,
          articlesOpened: Math.max(prev.articlesOpened, data.articlesOpened || 0),
          searchesPerformed: Math.max(prev.searchesPerformed, data.searchesPerformed || 0),
          aiRequestsPerformed: Math.max(prev.aiRequestsPerformed, data.aiRequestsPerformed || 0),
        }));
      }
    } catch {
      // Ignore network errors in status check
    }
  };

  useEffect(() => {
    refreshGuestStatus();
  }, [isGuest]);

  const recordArticleOpen = async (articleId: string): Promise<boolean> => {
    if (!isGuest) return true; // Unlimited for authenticated users

    if (isTrialExpired) {
      openAuthModal('login');
      return false;
    }

    if (usage.articlesOpened >= articlesLimit) {
      setLimitNoticeMessage(`You've reached your free limit of ${articlesLimit} articles today. Create a free account to continue reading.`);
      setShowLimitNotice(true);
      openAuthModal('register');
      return false;
    }

    try {
      // Call backend open tracker
      await api.post(`/news/articles/${articleId}/open`);
      setUsage((prev) => {
        const newOpened = prev.articlesOpened + 1;
        return { ...prev, articlesOpened: newOpened };
      });
      return true;
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'GUEST_LIMIT_REACHED') {
        setLimitNoticeMessage(err.message);
        setShowLimitNotice(true);
        openAuthModal('register');
        return false;
      }
      // Increment local counter if offline
      setUsage((prev) => ({ ...prev, articlesOpened: prev.articlesOpened + 1 }));
      return true;
    }
  };

  const recordSearch = (): boolean => {
    if (!isGuest) return true;

    if (isTrialExpired) {
      openAuthModal('login');
      return false;
    }

    if (usage.searchesPerformed >= searchesLimit) {
      setLimitNoticeMessage(`You've reached your free search limit (${searchesLimit}/day). Sign in or register for unlimited searches.`);
      setShowLimitNotice(true);
      openAuthModal('register');
      return false;
    }

    setUsage((prev) => ({ ...prev, searchesPerformed: prev.searchesPerformed + 1 }));
    return true;
  };

  const recordAiRequest = (): boolean => {
    if (!isGuest) return true;

    if (isTrialExpired) {
      openAuthModal('login');
      return false;
    }

    if (usage.aiRequestsPerformed >= aiLimit) {
      setLimitNoticeMessage(`You've used all ${aiLimit} free AI summaries/translations today. Create a free account to continue.`);
      setShowLimitNotice(true);
      openAuthModal('register');
      return false;
    }

    setUsage((prev) => ({ ...prev, aiRequestsPerformed: prev.aiRequestsPerformed + 1 }));
    return true;
  };

  const dismissLimitNotice = () => {
    setShowLimitNotice(false);
  };

  const articlesRemaining = Math.max(0, articlesLimit - usage.articlesOpened);
  const searchesRemaining = Math.max(0, searchesLimit - usage.searchesPerformed);
  const aiRemaining = Math.max(0, aiLimit - usage.aiRequestsPerformed);

  return (
    <GuestContext.Provider
      value={{
        isGuest,
        trialSecondsRemaining,
        isTrialExpired,
        resetTrialTimer,
        setDashboardActive: setIsDashboardActive,
        articlesOpened: usage.articlesOpened,
        articlesLimit,
        articlesRemaining,
        searchesPerformed: usage.searchesPerformed,
        searchesLimit,
        searchesRemaining,
        aiRequestsPerformed: usage.aiRequestsPerformed,
        aiLimit,
        aiRemaining,
        recordArticleOpen,
        recordSearch,
        recordAiRequest,
        refreshGuestStatus,
        showLimitNotice,
        limitNoticeMessage,
        dismissLimitNotice,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};


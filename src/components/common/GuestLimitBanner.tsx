import React from 'react';
import { Sparkles, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGuest } from '../../context/GuestContext';

export const GuestLimitBanner: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const {
    isGuest,
    articlesOpened,
    articlesLimit,
    articlesRemaining,
    searchesPerformed,
    searchesLimit,
    showLimitNotice,
    limitNoticeMessage,
    dismissLimitNotice,
  } = useGuest();

  if (user || !isGuest) return null;

  return (
    <div className="w-full bg-slate-900 border-b border-sky-500/30 text-white px-4 py-2.5 transition-all animate-fade-in shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="p-1 rounded bg-sky-500/20 text-sky-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <span className="font-semibold text-sky-200">
              Guest Access:
            </span>{' '}
            <span className="text-slate-200">
              {articlesOpened}/{articlesLimit} articles read today
            </span>{' '}
            <span className="text-slate-400">•</span>{' '}
            <span className="text-slate-200">
              {searchesPerformed}/{searchesLimit} searches used
            </span>
            {limitNoticeMessage && showLimitNotice && (
              <span className="block sm:inline font-bold text-amber-300 sm:ml-2">
                — {limitNoticeMessage}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => openAuthModal('register')}
            className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Free Account</span>
          </button>
          <button
            onClick={() => openAuthModal('login')}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          {showLimitNotice && (
            <button
              onClick={dismissLimitNotice}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

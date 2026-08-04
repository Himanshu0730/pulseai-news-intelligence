import React from 'react';
import { Clock, Lock, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGuest } from '../../context/GuestContext';

interface GuestTrialModalProps {
  activeView?: string;
}

export const GuestTrialModal: React.FC<GuestTrialModalProps> = ({ activeView }) => {
  const { user, openAuthModal } = useAuth();
  const { isGuest, trialSecondsRemaining, isTrialExpired } = useGuest();

  // If user is logged in, or on the landing page, don't show any guest trial UI
  if (user || !isGuest || activeView === 'landing') return null;

  return (
    <>
      {/* Floating 30s Countdown Badge when Trial is Active */}
      {!isTrialExpired && trialSecondsRemaining > 0 && (
        <div className="fixed bottom-5 right-5 z-40 animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/95 text-white rounded-full shadow-lg border border-sky-500/40 backdrop-blur-md text-xs font-ui">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-medium text-slate-200">Free Preview:</span>
            <span className="font-bold text-sky-300 font-mono text-xs">{trialSecondsRemaining}s</span>
          </div>
        </div>
      )}

      {/* Trial Expired Full Modal Overlay */}
      {isTrialExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center font-ui relative">
            
            {/* Top Icon Pill */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800 shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 text-[11px] font-bold uppercase tracking-wider border border-sky-200 dark:border-sky-800">
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span>30-Second Preview Expired</span>
              </div>
              
              <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-slate-100">
                Log In to Continue Exploring
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-ui pt-1">
                Your 30-second guest preview session has ended. Please log in or register for a free PulseAI account to continue reading news intelligence, AI executive summaries, and multi-outlet coverage.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => openAuthModal('login')}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Your Account</span>
              </button>

              <button
                onClick={() => openAuthModal('register')}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-sky-500" />
                <span>Create Free Account</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
              Free account includes unlimited searches, personalized interest feeds, and bookmarking.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

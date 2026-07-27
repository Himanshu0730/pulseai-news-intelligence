import React, { useState } from 'react';
import { Globe, Moon, Sun, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';

interface PublicHeaderProps {
  onExplore: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onExplore, onNavigateSection }) => {
  const { user, openAuthModal } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleNavClick = (sectionId: string) => {
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleNavClick('hero')}
              className="flex items-center gap-2.5 text-left group cursor-pointer border-0 bg-transparent p-0"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-serif font-bold text-white text-base shadow-sm group-hover:scale-105 transition-transform">
                P
              </div>
              <div>
                <span className="text-lg font-serif font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  Pulse<span className="text-sky-600 dark:text-sky-400 font-extrabold">AI</span>
                </span>
                <span className="hidden sm:block text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  News Intelligence
                </span>
              </div>
            </button>

            {/* Public Landing Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
              <button
                onClick={() => handleNavClick('features')}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              >
                {t('publicNavFeatures') || 'Features'}
              </button>
              <button
                onClick={() => handleNavClick('how-it-works')}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              >
                {t('publicNavHowItWorks') || 'How It Works'}
              </button>
              <button
                onClick={() => handleNavClick('languages')}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              >
                {t('publicNavLanguages') || 'Languages'}
              </button>
              <button
                onClick={() => handleNavClick('privacy')}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              >
                {t('publicNavAbout') || 'About & Privacy'}
              </button>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* Explore Trending Link */}
            <button
              onClick={onExplore}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('exploreTrending') || 'Explore Trending'}</span>
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                title="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="font-mono uppercase">{currentLangObj.code}</span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 max-h-64 overflow-y-auto text-xs">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                        language === lang.code ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{lang.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            {/* Auth Buttons */}
            {user ? (
              <button
                onClick={onExplore}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                {t('openApp') || 'Open App'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {t('signIn')}
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <User className="w-3 h-3" />
                  <span>{t('getStarted')}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

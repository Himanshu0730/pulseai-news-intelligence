import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Globe,
  LogOut,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  User,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBookmarks } from '../../context/BookmarkContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeView: 'landing' | 'feed' | 'india' | 'world' | 'trending' | 'bookmarks';
  onViewChange: (view: 'landing' | 'feed' | 'india' | 'world' | 'trending' | 'bookmarks') => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
  onOpenProfile,
}) => {
  const { user, openAuthModal, logout } = useAuth();
  const { bookmarks } = useBookmarks();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onSearchChange(localSearch);
    if (activeView !== 'feed') {
      onViewChange('feed');
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onSearchChange('');
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Brand & Logo */}
          <div className="flex items-center gap-4 lg:gap-6">
            <button
              onClick={() => {
                onViewChange('landing');
              }}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
              title="Return to Public Landing Page"
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

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onViewChange('feed')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activeView === 'feed'
                    ? 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onViewChange('india')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'india'
                    ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <span>🇮🇳</span>
                <span>India</span>
              </button>
              <button
                onClick={() => onViewChange('world')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'world'
                    ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-semibold border border-sky-300 dark:border-sky-800 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <span>🌍</span>
                <span>World</span>
              </button>
              <button
                onClick={() => onViewChange('trending')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activeView === 'trending'
                    ? 'bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-300 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {t('trendingStories')}
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm relative">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={localSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalSearch(value);
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = setTimeout(() => {
                    onSearchChange(value);
                  }, 300);
                }}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-lg placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Right Actions & Utilities */}
          <div className="flex items-center gap-2">
            {/* Bookmarks Counter Button */}
            <button
              onClick={() => onViewChange('bookmarks')}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeView === 'bookmarks'
                  ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              title={t('savedBookmarks')}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t('savedBookmarks')}</span>
              {bookmarks.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-sky-600 text-white rounded-full">
                  {bookmarks.length}
                </span>
              )}
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                title="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline font-mono uppercase">{currentLangObj.code}</span>
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

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>

            {/* User Profile / Auth Actions */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                  title={t('adjustInterests')}
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span className="hidden xl:inline max-w-[100px] truncate">{user.name}</span>
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                </button>

                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title={t('signOut')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
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

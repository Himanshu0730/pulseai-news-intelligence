import React, { useState } from 'react';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { GuestTrialModal } from './components/common/GuestTrialModal';
import { Navbar } from './components/common/Navbar';
import { PublicHeader } from './components/common/PublicHeader';
import { ProfileModal } from './components/profile/ProfileModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { GuestProvider, useGuest } from './context/GuestContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { BookmarksPage } from './pages/BookmarksPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';

const MainLayout: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const { setDashboardActive } = useGuest();
  const [activeView, setActiveView] = useState<'landing' | 'feed' | 'india' | 'world' | 'trending' | 'bookmarks'>('landing');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Activate dashboard trial timer only when user navigates away from landing page
  React.useEffect(() => {
    setDashboardActive(activeView !== 'landing');
  }, [activeView, setDashboardActive]);

  const handleGetStarted = () => {
    const hasConfigured = localStorage.getItem('has_configured_preferences') === 'true';
    if (hasConfigured || (user && user.interests && user.interests.length > 0)) {
      setActiveView('feed');
    } else {
      setIsOnboardingOpen(true);
    }
  };

  const handleExplore = () => {
    setActiveView('feed');
  };

  return (
    <div className="min-h-screen font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Shell Headers: Public Shell vs App Shell */}
      {activeView === 'landing' ? (
        <PublicHeader
          onExplore={() => setActiveView('trending')}
          onNavigateSection={(sectionId) => {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      ) : (
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (activeView !== 'feed' && activeView !== 'india' && activeView !== 'world') {
              setActiveView('feed');
            }
          }}
          activeView={activeView}
          onViewChange={setActiveView}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      )}

      {/* Guest Trial 30-Second Countdown & Modal Overlay (only on Dashboard) */}
      <GuestTrialModal activeView={activeView} />

      {/* Main View Router */}
      <main>
        {activeView === 'landing' ? (
          <LandingPage
            onExplore={handleExplore}
            onGetStarted={handleGetStarted}
          />
        ) : activeView === 'bookmarks' ? (
          <BookmarksPage />
        ) : (
          <HomePage
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenProfile={() => setIsProfileOpen(true)}
            activeView={activeView}
          />
        )}
      </main>

      {/* Onboarding Category Customizer */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => {
          setIsOnboardingOpen(false);
          setActiveView('feed');
        }}
      />

      {/* Profile Interest Customization Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaveSuccess={() => {
          if (activeView !== 'feed') setActiveView('feed');
        }}
      />

      {/* Auth Modal Overlay */}
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <GuestProvider>
            <BookmarkProvider>
              <MainLayout />
            </BookmarkProvider>
          </GuestProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

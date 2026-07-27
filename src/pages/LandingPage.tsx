import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  Globe,
  Bookmark,
  Search,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Cpu,
  Newspaper,
  Layers,
  ChevronRight,
  BookOpen,
  Filter,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

interface LandingPageProps {
  onExplore: () => void;
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onExplore, onGetStarted }) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* 1. HERO SECTION */}
      <section id="hero" className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200 dark:border-slate-800">
        {/* Subtle background glow accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 dark:bg-sky-500/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-amber-500/10 dark:bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Top Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{t('brandTagline')} v2.5</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.15]"
            >
              {t('heroTitle')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-sans leading-relaxed"
            >
              {t('heroSubtitle')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                id="hero-cta-get-started"
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{t('heroCtaPrimary')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="hero-cta-explore"
                onClick={onExplore}
                className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t('heroCtaSecondary')}</span>
              </button>
            </motion.div>
          </div>

          {/* Visual App Preview Frame */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-14 relative mx-auto max-w-5xl rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            {/* Window bar header */}
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900 px-3 py-1 rounded-md">
                https://pulseai.app/intelligence-feed
              </div>
              <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-medium">
                <Zap className="w-3.5 h-3.5" />
                <span>Live Feed</span>
              </div>
            </div>

            {/* Dashboard Mockup Content */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Main Feed Column */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Personalized Briefings</span>
                  </div>
                  <span className="text-xs font-mono bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                    Relevance Score: 94.8%
                  </span>
                </div>

                {/* Card 1 */}
                <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-sky-700 dark:text-sky-400">Reuters • AI & ML</span>
                    <span>12m ago</span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
                    Next-Generation Neural Architecture Sets New Benchmarks for Energy Efficiency
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    Researchers demonstrate a novel quantum-inspired transformer model reducing training energy consumption by 42%.
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Filter className="w-3 h-3 text-amber-500" /> Matched to your AI & Technology preference
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      3 min read
                    </span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Financial Times • Business</span>
                    <span>45m ago</span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
                    Global Monetary Policy Shifts Signal Strategic Capital Allocation to Clean Tech
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    Central banks report increased liquidity reserves directed toward green transition bond issuances.
                  </p>
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span>Real-Time Trending</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium">#1 Quantum Computing</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">+184%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium">#2 Clean Tech Energy</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">+120%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium">#3 Federal Reserve</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">+92%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs space-y-2">
                  <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Gemini AI Briefing</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    "AI summaries generated on demand with zero key leakage. Instant 60-second TL;DRs with 100% server-side processing."
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. WHY PULSEAI */}
      <section className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {t('whyPulseTitle')}
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">
              {t('whyPulseSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                Deterministic Scoring
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                No opaque clickbait algorithms. Your feed is sorted using a mathematical, transparent formula based on interest overlap, freshness, and explicit preferences.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                Gemini 3.6 Flash Intelligence
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive instant 60-second executive summaries, key bullet point takeaways, sentiment evaluation, and reading time savings.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                10 Regional Languages
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Native interface translations for English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, and Punjabi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PERSONALIZED NEWS & 4. MULTI-SOURCE AGGREGATION & 5. AI BRIEFINGS */}
      <section id="features" className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t('featPersonalizedTitle')}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('featPersonalizedDesc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t('featMultiSourceTitle')}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('featMultiSourceDesc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t('featAiSummaryTitle')}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('featAiSummaryDesc')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-rose-500" />
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t('featTrendingTitle')}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('featTrendingDesc')}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <Bookmark className="w-5 h-5 text-emerald-500" />
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t('featBookmarksTitle')}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('featBookmarksDesc')}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-sky-500" />
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t('featLanguagesTitle')}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('featLanguagesDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. HOW PERSONALIZATION WORKS (DETERMINISTIC FORMULA EXPLANATION) */}
      <section id="how-it-works" className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {t('howItWorksTitle')}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400 font-sans">
              {t('howItWorksDesc')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div className="p-5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30">
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">40%</div>
              <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('formulaInterest')}
              </div>
            </div>

            <div className="p-5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">20%</div>
              <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('formulaTopic')}
              </div>
            </div>

            <div className="p-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">15%</div>
              <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('formulaFreshness')}
              </div>
            </div>

            <div className="p-5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30">
              <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">15%</div>
              <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('formulaEngagement')}
              </div>
            </div>

            <div className="p-5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30">
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">10%</div>
              <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('formulaTrending')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. LANGUAGE SELECTOR DISPLAY SECTION */}
      <section id="languages" className="py-12 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Multi-Language Interface Support</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  language === lang.code
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>{lang.nativeName}</span>
                <span className="opacity-60 ml-1">({lang.name})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PRIVACY & SECURITY */}
      <section id="privacy" className="py-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
            <ShieldCheck className="w-5 h-5" />
            <span>{t('privacyTitle')}</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('privacyDesc')}
          </p>
        </div>
      </section>

      {/* 12. FINAL CTA */}
      <section className="py-16 md:py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold">
            {t('finalCtaTitle')}
          </h2>
          <p className="text-slate-300 text-base max-w-xl mx-auto">
            {t('finalCtaSub')}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-base transition-colors flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>{t('getStarted')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExplore}
              className="px-8 py-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-base transition-colors cursor-pointer"
            >
              <span>{t('exploreNews')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="py-10 bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-sky-600 flex items-center justify-center font-serif font-bold text-white text-xs">
              P
            </div>
            <span className="font-semibold text-slate-200 text-sm">{t('brandName')}</span>
            <span className="text-slate-500">• {t('brandTagline')}</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <button onClick={onExplore} className="hover:text-slate-200 transition-colors">
              {t('exploreNews')}
            </button>
            <button onClick={onGetStarted} className="hover:text-slate-200 transition-colors">
              {t('signIn')}
            </button>
            <span>© 2026 PulseAI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

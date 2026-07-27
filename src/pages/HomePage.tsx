import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, SlidersHorizontal, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { GeographicScopeSelector, GeoScope } from '../components/common/GeographicScopeSelector';
import { ArticleCardSkeleton } from '../components/common/Skeleton';
import { AISummaryModal } from '../components/news/AISummaryModal';
import { ArticleCard } from '../components/news/ArticleCard';
import { ArticleDetailModal } from '../components/news/ArticleDetailModal';
import { CategoryNav } from '../components/news/CategoryNav';
import { CompareCoverageModal } from '../components/news/CompareCoverageModal';
import { TrendingSection } from '../components/news/TrendingSection';
import { useAuth } from '../context/AuthContext';
import { useGuest } from '../context/GuestContext';
import { useLanguage } from '../context/LanguageContext';
import { AISummary, Article, Category } from '../types';

interface HomePageProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenProfile: () => void;
  activeView?: 'landing' | 'feed' | 'india' | 'world' | 'trending' | 'bookmarks';
}

export const HomePage: React.FC<HomePageProps> = ({
  searchQuery,
  onSearchChange,
  onOpenProfile,
  activeView = 'feed',
}) => {
  const { user, openAuthModal } = useAuth();
  const { recordArticleOpen, recordSearch, recordAiRequest } = useGuest();
  const { language, t } = useLanguage();

  // Scope state
  const [currentScope, setCurrentScope] = useState<GeoScope>(
    activeView === 'india' ? 'india' : activeView === 'world' ? 'world' : 'all'
  );

  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [articles, setArticles] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('News Engine');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedArticleDetail, setSelectedArticleDetail] = useState<Article | null>(null);
  const [compareArticle, setCompareArticle] = useState<Article | null>(null);
  const [summaryArticle, setSummaryArticle] = useState<Article | null>(null);
  const [summaryData, setSummaryData] = useState<AISummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  // Sync currentScope when activeView tab changes
  useEffect(() => {
    if (activeView === 'india') {
      setCurrentScope('india');
    } else if (activeView === 'world') {
      setCurrentScope('world');
    }
  }, [activeView]);

  // Load News Feed & Trending Data
  const loadNews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data: { articles: Article[]; activeProvider: string };

      if (searchQuery.trim()) {
        const allowed = recordSearch();
        if (!allowed) {
          setIsLoading(false);
          return;
        }
        data = await api.get<{ articles: Article[]; activeProvider: string }>(
          `/news/search?q=${encodeURIComponent(searchQuery)}&scope=${currentScope}`
        );
      } else if (selectedCategory !== 'All') {
        data = await api.get<{ articles: Article[]; activeProvider: string }>(
          `/news/category/${encodeURIComponent(selectedCategory)}?scope=${currentScope}`
        );
      } else {
        data = await api.get<{ articles: Article[]; activeProvider: string }>(
          `/news/feed?scope=${currentScope}`
        );
      }

      setArticles(data.articles || []);
      setActiveProvider(data.activeProvider || 'News Engine');
    } catch (err: any) {
      console.error('Error fetching news feed', err);
      if (err instanceof ApiError && err.code === 'GUEST_LIMIT_REACHED') {
        openAuthModal('register');
      } else {
        setError('Unable to load latest news stories. Please verify your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const data = await api.get<{ articles: Article[]; topics: string[] }>(
        `/news/trending?scope=${currentScope}`
      );
      setTrendingArticles(data.articles || []);
      setTrendingTopics(data.topics || []);
    } catch (err) {
      console.warn('Error loading trending stories', err);
    }
  };

  useEffect(() => {
    loadNews();
  }, [searchQuery, selectedCategory, currentScope, user?.interests]);

  useEffect(() => {
    loadTrending();
  }, [currentScope]);

  // Select article detail with guest limit enforcement
  const handleSelectArticle = async (article: Article) => {
    const allowed = await recordArticleOpen(article.id);
    if (allowed) {
      setSelectedArticleDetail(article);
    }
  };

  // Request AI Summary
  const handleRequestSummary = async (article: Article) => {
    const allowed = recordAiRequest();
    if (!allowed) return;

    setSummaryArticle(article);
    setSummaryData(null);
    setIsSummaryLoading(true);

    try {
      const res = await api.post<{ summary: AISummary }>('/summaries/generate', {
        articleId: article.id,
        title: article.title,
        content: article.content || article.description,
        url: article.url,
        language,
      });
      setSummaryData(res.summary);
    } catch (err: any) {
      console.error('Failed to generate summary', err);
      if (err instanceof ApiError && err.code === 'GUEST_LIMIT_REACHED') {
        openAuthModal('register');
      }
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const displayedArticles = activeView === 'trending' ? trendingArticles : articles;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-16 transition-colors duration-200">
      {/* Category Navigation Bar */}
      <CategoryNav
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          if (searchQuery) onSearchChange('');
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full flex-1">
        
        {/* Banner Indicator with Geographic Scope Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {activeView === 'india'
                  ? '🇮🇳 India News Intelligence'
                  : activeView === 'world'
                  ? '🌍 World News & Geopolitics'
                  : activeView === 'trending'
                  ? t('trendingStories')
                  : searchQuery
                  ? `${t('feedNoticeSearch')} "${searchQuery}"`
                  : selectedCategory !== 'All'
                  ? `${selectedCategory} News`
                  : user
                  ? t('feedNoticePersonalized')
                  : t('feedNoticeGlobal')}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              {activeView === 'india'
                ? 'Prioritizing Indian institutions, regional coverage, PIB, RBI, tech startups, and state developments'
                : activeView === 'world'
                ? 'Global geopolitical events, international trade, international science and global markets'
                : activeView === 'trending'
                ? 'Cross-publisher velocity metrics and high-frequency topics'
                : user
                ? `6-factor scoring model prioritizing ${user.interests.join(', ')}`
                : `Multi-source aggregation (${activeProvider}) with zero-config failover`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Geographic Scope Selector */}
            <GeographicScopeSelector
              currentScope={currentScope}
              onScopeChange={(scope) => setCurrentScope(scope)}
            />

            {user && activeView !== 'trending' ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">{t('adjustInterests')}</span>
              </button>
            ) : null}

            <button
              onClick={loadNews}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Grid: Articles + Trending Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Connection Notice</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">{error}</p>
                <button
                  onClick={loadNews}
                  className="px-4 py-2 bg-sky-600 text-white font-semibold text-xs rounded-lg hover:bg-sky-700 transition-colors inline-block cursor-pointer"
                >
                  Retry Fetch
                </button>
              </div>
            ) : displayedArticles.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <Search className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100">No News Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We couldn't find any stories matching your filter criteria and scope ({currentScope.toUpperCase()}).
                </p>
                <button
                  onClick={() => {
                    onSearchChange('');
                    setSelectedCategory('All');
                    setCurrentScope('all');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {displayedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onSelectArticle={handleSelectArticle}
                    onRequestSummary={handleRequestSummary}
                    onCompareCoverage={(art) => setCompareArticle(art)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar: Trending Topics & Stories */}
          <div className="space-y-6">
            <TrendingSection
              articles={trendingArticles}
              topics={trendingTopics}
              onSelectArticle={setSelectedArticleDetail}
              onSelectTopic={(topic) => onSearchChange(topic)}
            />

            {/* Platform Feature Highlight Card */}
            <div className="bg-sky-50/70 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider">India & Global Coverage</span>
              </div>
              <h4 className="text-sm font-serif font-bold text-slate-900 dark:text-slate-100">
                Transparent Source Intelligence
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Every story undergoes multi-outlet corroboration scoring, distinguishing official filings from third-party commentary with complete certainty.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticleDetail}
        onClose={() => setSelectedArticleDetail(null)}
        onRequestSummary={handleRequestSummary}
      />

      {/* Compare Coverage Modal */}
      <CompareCoverageModal
        article={compareArticle}
        isOpen={!!compareArticle}
        onClose={() => setCompareArticle(null)}
      />

      {/* AI Summary Modal */}
      <AISummaryModal
        article={summaryArticle}
        summary={summaryData}
        isLoading={isSummaryLoading}
        onClose={() => setSummaryArticle(null)}
      />
    </div>
  );
};

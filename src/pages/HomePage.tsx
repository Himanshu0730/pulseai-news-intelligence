import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, SlidersHorizontal, Sparkles, Layers, Grid } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { GeographicScopeSelector, GeoScope } from '../components/common/GeographicScopeSelector';
import { ArticleCardSkeleton, SmartSkeletonFeed } from '../components/common/Skeleton';
import { AISummaryModal } from '../components/news/AISummaryModal';
import { ArticleCard } from '../components/news/ArticleCard';
import { ArticleDetailModal } from '../components/news/ArticleDetailModal';
import { CategoryNav } from '../components/news/CategoryNav';
import { CompareCoverageModal } from '../components/news/CompareCoverageModal';
import { StoryCard } from '../components/news/StoryCard';
import { StoryDetailModal } from '../components/news/StoryDetailModal';
import { TrendingSection } from '../components/news/TrendingSection';
import { ViralSignalsSection } from '../components/news/ViralSignalsSection';
import { useAuth } from '../context/AuthContext';
import { useGuest } from '../context/GuestContext';
import { useLanguage } from '../context/LanguageContext';
import { AISummary, Article, Category, StoryCluster } from '../types';

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

  const [feedMode, setFeedMode] = useState<'stories' | 'articles'>('stories');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [articles, setArticles] = useState<Article[]>([]);
  const [storyClusters, setStoryClusters] = useState<StoryCluster[]>([]);
  const [unclusteredArticles, setUnclusteredArticles] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('News Intelligence Engine');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Monotonic sequence counters: stale responses (from a previous scope/search/
  // category/feed-mode request) are dropped so a slow older request can never
  // overwrite fresher results or flash the UI backwards.
  const feedRequestSeq = useRef(0);
  const trendingRequestSeq = useRef(0);

  // Bumped by the Refresh button so ViralSignalsSection also refetches (scope-
  // aware) instead of serving a fresh client-cache entry.
  const [socialRefreshKey, setSocialRefreshKey] = useState(0);

  // Perf: records the launch time of the newest feed request so the first
  // content commit can be measured end-to-end from initial load.
  const newsLaunchTime = useRef<number | null>(null);

  // Progressive rendering: only enough cards for the first screen are mounted
  // initially; an IntersectionObserver sentinel mounts more as the user scrolls.
  const INITIAL_RENDER_COUNT = 6;
  const RENDER_BATCH = 6;
  const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT);
  const renderSentinelRef = useRef<HTMLDivElement | null>(null);

  const logPerf = (label: string, ms: number, detail = '') => {
    const width = 26;
    const padded = label.length >= width ? label.slice(0, width) : label.padEnd(width, '.');
    console.log(`[perf] ${padded} ${Math.round(ms)}ms${detail ? ` (${detail})` : ''}`);
  };

  // Modal states
  const [selectedStoryCluster, setSelectedStoryCluster] = useState<StoryCluster | null>(null);
  const [selectedArticleDetail, setSelectedArticleDetail] = useState<Article | null>(null);
  const [compareArticle, setCompareArticle] = useState<Article | null>(null);
  const [compareRelatedArticles, setCompareRelatedArticles] = useState<Article[]>([]);
  const [summaryArticle, setSummaryArticle] = useState<Article | null>(null);
  const [summaryData, setSummaryData] = useState<AISummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  // Sync scope when activeView changes
  useEffect(() => {
    if (activeView === 'india') {
      setCurrentScope('india');
    } else if (activeView === 'world') {
      setCurrentScope('world');
    }
  }, [activeView]);

  // Load News Feed & Clusters. Pass force=true (Refresh button) to bypass both
  // the client and server caches so the response is genuinely fresh data.
  const loadNews = async (force = false) => {
    const t0 = performance.now();
    if (newsLaunchTime.current === null) newsLaunchTime.current = t0;
    const seq = ++feedRequestSeq.current;
    // Keep existing content visible during refreshes/search/scope changes so a
    // cached (fast) response does not flash a full skeleton feed.
    const hasExisting = articles.length > 0 || storyClusters.length > 0;
    if (!hasExisting) setIsLoading(true);
    setError(null);

    const freshParam = force ? '&refresh=1' : '';
    const refreshOpt = { refresh: force };

    // Primary feed. Renders the instant it resolves — it is NOT gated behind
    // the story-clusters request, so the first screen never waits on RSS or
    // Gemini briefing generation.
    const runFeed = async () => {
      const feedT0 = performance.now();
      try {
        let feedPromise: Promise<{ articles: Article[]; activeProvider: string }>;

        if (searchQuery.trim()) {
          const allowed = recordSearch();
          if (!allowed) {
            if (seq === feedRequestSeq.current && !hasExisting) setIsLoading(false);
            return;
          }
          feedPromise = api.get<{ articles: Article[]; activeProvider: string }>(
            `/news/search?q=${encodeURIComponent(searchQuery)}&scope=${currentScope}${freshParam}`,
            refreshOpt
          );
        } else if (selectedCategory !== 'All') {
          feedPromise = api.get<{ articles: Article[]; activeProvider: string }>(
            `/news/category/${encodeURIComponent(selectedCategory)}?scope=${currentScope}${freshParam}`,
            refreshOpt
          );
        } else {
          feedPromise = api.get<{ articles: Article[]; activeProvider: string }>(
            `/news/feed?scope=${currentScope}${freshParam}`,
            refreshOpt
          );
        }

        const feedResult = await feedPromise;
        if (seq !== feedRequestSeq.current) return;
        logPerf('News Feed', performance.now() - feedT0, `${feedResult.articles.length} articles`);
        setArticles(feedResult.articles || []);
        setActiveProvider(feedResult.activeProvider || 'News Intelligence Engine');
      } catch (err: any) {
        if (seq !== feedRequestSeq.current) return;
        console.error('Error fetching news feed', err);
        if (err instanceof ApiError && err.code === 'GUEST_LIMIT_REACHED') {
          openAuthModal('register');
        } else {
          setError('Unable to load latest news stories. Please check your connection and try again.');
        }
      } finally {
        if (seq === feedRequestSeq.current && !hasExisting) setIsLoading(false);
      }
    };

    // Story clusters: fetched asynchronously in a fully non-blocking fashion.
    // When they land they replace the flat feed (in stories mode); they never
    // delay the first paint of the article feed. Category clusters are fetched
    // too, so "Story Clusters" + a category combine into grouped category stories.
    const runClusters = async () => {
      const clustersT0 = performance.now();
      const shouldFetch = feedMode === 'stories' && !searchQuery.trim();
      if (!shouldFetch) {
        if (seq === feedRequestSeq.current) {
          setStoryClusters([]);
          setUnclusteredArticles([]);
        }
        return;
      }
      try {
        const categoryParam =
          selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
        const res = await api.get<{ clusters: StoryCluster[]; unclustered?: Article[] }>(
          `/news/clusters?scope=${currentScope}${categoryParam}${freshParam}`,
          refreshOpt
        );
        if (seq !== feedRequestSeq.current) return;
        logPerf('Story Clusters', performance.now() - clustersT0, `${res.clusters?.length || 0} clusters`);
        setStoryClusters(res.clusters || []);
        // Articles that failed clustering are rendered as an "Other Stories"
        // section so no story silently disappears from the clusters view.
        setUnclusteredArticles(res.unclustered || []);
      } catch (err) {
        if (seq !== feedRequestSeq.current) return;
        console.warn('Failed to load story clusters, proceeding with feed:', err);
        setStoryClusters([]);
        setUnclusteredArticles([]);
      } finally {
        if (seq === feedRequestSeq.current && !hasExisting) setIsLoading(false);
      }
    };

    void runFeed();
    void runClusters();

    logPerf('HomePage loadNews (launch)', performance.now() - t0);
  };

  const loadTrending = async (force = false) => {
    const t0 = performance.now();
    const seq = ++trendingRequestSeq.current;
    try {
      const data = await api.get<{ articles: Article[]; topics: string[] }>(
        `/news/trending?scope=${currentScope}${force ? '&refresh=1' : ''}`,
        { refresh: force }
      );
      if (seq !== trendingRequestSeq.current) return;
      logPerf('News Trending', performance.now() - t0, `${data.articles.length} articles`);
      setTrendingArticles(data.articles || []);
      setTrendingTopics(data.topics || []);
    } catch (err) {
      console.warn('Error loading trending stories', err);
    }
  };

  useEffect(() => {
    loadNews();
  }, [searchQuery, selectedCategory, currentScope, feedMode, user?.interests]);

  useEffect(() => {
    loadTrending();
  }, [currentScope]);

  // Searching must never show stale category state: once the user searches, the
  // category highlight/context resets to 'All' (the search branch owns the feed).
  useEffect(() => {
    if (searchQuery.trim()) {
      setSelectedCategory('All');
    }
  }, [searchQuery]);

  // Reset the progressive-render window whenever a new dataset arrives.
  useEffect(() => {
    setRenderCount(INITIAL_RENDER_COUNT);
  }, [articles, trendingArticles, storyClusters, unclusteredArticles]);

  // Perf: measure the time from feed request launch to first content commit.
  useEffect(() => {
    if (!isLoading && newsLaunchTime.current !== null) {
      logPerf('React render (first content)', performance.now() - newsLaunchTime.current);
      newsLaunchTime.current = null;
    }
  }, [isLoading]);

  // Mount more article cards as the user scrolls (lazy loading for below-fold
  // content) so the first screen only renders what is actually visible.
  useEffect(() => {
    const sentinel = renderSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderCount((c) => c + RENDER_BATCH);
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [articles, trendingArticles, feedMode, selectedCategory, searchQuery, activeView, renderCount]);

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

  // The main feed column always shows the current search/category dataset when a
  // filter is active (even on the Trending view), so search results and category
  // feeds are never hidden behind the trending placeholder.
  const displayedArticles =
    searchQuery.trim() || selectedCategory !== 'All'
      ? articles
      : activeView === 'trending'
      ? trendingArticles
      : articles;

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
        
        {/* Banner Indicator with Geographic Scope & Feed View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {activeView === 'india'
                  ? '🇮🇳 India News Intelligence'
                  : activeView === 'world'
                  ? '🌍 World News & Geopolitics'
                  : activeView === 'trending'
                  ? t('trendingStories')
                  : searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : selectedCategory !== 'All'
                  ? `${selectedCategory} News`
                  : user
                  ? t('feedNoticePersonalized')
                  : 'Personalized News Intelligence Dashboard'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-ui">
              {activeView === 'india'
                ? 'Prioritizing Indian policy, tech hubs, state news, and PIB official announcements'
                : activeView === 'world'
                ? 'Global geopolitical events, international trade, and market dynamics'
                : activeView === 'trending'
                ? 'Cross-publisher coverage velocity metrics and high-frequency topics'
                : user
                ? `Scored multi-factor feed matching your interests: ${user.interests.join(', ')}`
                : `Story aggregation & multi-source corroboration (${activeProvider})`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* View Mode Switcher: Story Clusters vs All Articles */}
            {!searchQuery && activeView !== 'trending' && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setFeedMode('stories')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    feedMode === 'stories'
                      ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Group articles into Story Clusters"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Story Clusters</span>
                </button>
                <button
                  onClick={() => setFeedMode('articles')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    feedMode === 'articles'
                      ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Show flat article feed"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>All Articles</span>
                </button>
              </div>
            )}

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
              onClick={() => {
                loadNews(true);
                loadTrending(true);
                setSocialRefreshKey((k) => k + 1);
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Grid: Feed Column + Trending Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <SmartSkeletonFeed
                mode={feedMode}
                statusText={
                  searchQuery
                    ? `Searching news intelligence for "${searchQuery}"...`
                    : selectedCategory !== 'All'
                    ? `Fetching ${selectedCategory} stories from corroborated feeds...`
                    : currentScope === 'india'
                    ? 'Syncing India official PIB & regional headlines...'
                    : currentScope === 'world'
                    ? 'Aggregating global geopolitical intelligence...'
                    : 'Generating live news intelligence feed...'
                }
              />
            ) : error ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Connection Notice</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">{error}</p>
                <button
                  onClick={loadNews}
                  className="px-4 py-2 bg-sky-700 text-white font-semibold text-xs rounded-lg hover:bg-sky-800 transition-colors inline-block cursor-pointer"
                >
                  Retry Fetch
                </button>
              </div>
            ) : feedMode === 'stories' && !searchQuery && storyClusters.length > 0 ? (
              /* Story Clusters First View */
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    Grouped Event Clusters ({storyClusters.length} Stories)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing multi-outlet corroboration
                  </span>
                </div>
                {storyClusters.slice(0, renderCount).map((cluster) => (
                  <StoryCard
                    key={cluster.clusterId}
                    cluster={cluster}
                    onOpenStory={(cls) => setSelectedStoryCluster(cls)}
                    onCompareCoverage={(art, related) => {
                      setCompareArticle(art);
                      setCompareRelatedArticles(related || []);
                    }}
                  />
                ))}
                {storyClusters.length > renderCount && (
                  <div ref={renderSentinelRef} className="h-2 w-full" aria-hidden="true" />
                )}
                {unclusteredArticles.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        Other Stories ({unclusteredArticles.length})
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Single-outlet stories awaiting corroboration
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 auto-rows-fr">
                      {unclusteredArticles.slice(0, renderCount).map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          variant="standard"
                          onSelectArticle={handleSelectArticle}
                          onRequestSummary={handleRequestSummary}
                          onCompareCoverage={(art) => {
                            setCompareArticle(art);
                            setCompareRelatedArticles([]);
                          }}
                        />
                      ))}
                    </div>
                    {unclusteredArticles.length > renderCount && (
                      <div ref={renderSentinelRef} className="h-2 w-full" aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
            ) : displayedArticles.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 font-ui shadow-2xs">
                <Search className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100">No News Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  No stories matched your criteria and scope ({currentScope.toUpperCase()}). Try adjusting your search query or interest topics.
                </p>
                <button
                  onClick={() => {
                    onSearchChange('');
                    setSelectedCategory('All');
                    setCurrentScope('all');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Clear Filters & Reset
                </button>
              </div>
            ) : (
              /* Flat Article Cards View with Editorial Hero Lead */
              <div className="space-y-6">
                {displayedArticles.length > 0 && (
                  <ArticleCard
                    key={displayedArticles[0].id}
                    article={displayedArticles[0]}
                    variant="hero"
                    onSelectArticle={handleSelectArticle}
                    onRequestSummary={handleRequestSummary}
                    onCompareCoverage={(art) => {
                      setCompareArticle(art);
                      setCompareRelatedArticles([]);
                    }}
                  />
                )}

                {displayedArticles.length > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-4 px-1 font-ui">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Developing News Stream ({displayedArticles.length - 1} Stories)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 auto-rows-fr">
                      {displayedArticles.slice(1, renderCount).map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          variant="standard"
                          onSelectArticle={handleSelectArticle}
                          onRequestSummary={handleRequestSummary}
                          onCompareCoverage={(art) => {
                            setCompareArticle(art);
                            setCompareRelatedArticles([]);
                          }}
                        />
                      ))}
                    </div>
                    {displayedArticles.length > renderCount && (
                      <div ref={renderSentinelRef} className="h-2 w-full" aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Signal Trends & Intelligence Highlights */}
          <div className="space-y-6">
            <TrendingSection
              articles={trendingArticles}
              topics={trendingTopics}
              onSelectArticle={handleSelectArticle}
              onSelectTopic={(topic) => onSearchChange(topic)}
              isLoading={isLoading}
            />

            <ViralSignalsSection scope={currentScope} refreshToken={socialRefreshKey} />

            {/* Platform Feature Highlight Card */}
            <div className="bg-sky-50/70 dark:bg-slate-900 border border-sky-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3 font-ui shadow-2xs">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Source Grounding</span>
              </div>
              <h4 className="text-sm font-editorial font-bold text-slate-900 dark:text-slate-100">
                Transparent Evidence Pipeline
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-ui">
                Every story briefing is backed by verifiable quotes and source citations, enabling instant source-level comparison without hallucinations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Story Detail Modal */}
      <StoryDetailModal
        cluster={selectedStoryCluster}
        onClose={() => setSelectedStoryCluster(null)}
      />

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticleDetail}
        onClose={() => setSelectedArticleDetail(null)}
        onRequestSummary={handleRequestSummary}
      />

      {/* Compare Coverage Modal */}
      <CompareCoverageModal
        article={compareArticle}
        relatedArticles={compareRelatedArticles}
        isOpen={!!compareArticle}
        onClose={() => {
          setCompareArticle(null);
          setCompareRelatedArticles([]);
        }}
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

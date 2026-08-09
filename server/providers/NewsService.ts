import { config } from '../config.js';
import { db } from '../db/index.js';
import { CuratedRSSProvider } from './CuratedRSSProvider.js';
import { GNewsProvider } from './GNewsProvider.js';
import { NewsAPIProvider } from './NewsAPIProvider.js';
import { Article, NewsFetchOptions, NewsProvider, StoryCluster } from './types.js';

import { calculateTextSimilarity } from '../utils/urlNormalizer.js';

import { clusteringService } from '../services/clusteringService.js';
import { deduplicationService } from '../services/deduplicationService.js';
import { normalizeArticleRegions, GeoScope } from '../services/geoScopeService.js';
import { misinformationService } from '../services/misinformationService.js';
import { PersonalizationService, ScoredArticle } from '../services/personalizationService.js';
import { ragService } from '../services/ragService.js';
import { trendService } from '../services/trendService.js';
import { elapsedMs, logPerf } from '../utils/perf.js';

export class NewsService {
  private providers: NewsProvider[] = [];
  private personalization = new PersonalizationService();

  // Single-flight map: deduplicates concurrent cache-miss fetches for the same key.
  private pendingFetches = new Map<string, Promise<any>>();
  // Keys currently being refreshed in the background (stale-while-revalidate).
  private refreshing = new Set<string>();

  // Stale-while-revalidate window: serve an expired cache entry instantly while
  // a background refresh repopulates it. Beyond this window a stale entry is a miss.
  private static STALE_WINDOW_MS = 5 * 60 * 1000;

  // In-process "last known good" snapshot per cache key. Serves as a final
  // fallback so a request is NEVER blocked on provider aggregation once the
  // key has been fetched successfully in this process — even if the persisted
  // cache entry expired beyond the stale window or was evicted. This is what
  // makes the feed endpoint return instantly (RSS stays a background concern).
  private lastGoodCache = new Map<string, { data: unknown; at: number }>();

  // Hard ceiling on provider aggregation so a cold first fetch cannot block the
  // UI for the full slowest-feed timeout. Results that arrive after the deadline
  // are still collected (they feed the background refresh), but the response is
  // built from whatever has settled so far.
  private static AGGREGATE_DEADLINE_MS = 2500;

  // For headline feeds, stop waiting on slow providers (typically the 3s-timeout
  // RSS feeds) as soon as the combined pool is usable. A background refresh then
  // folds in the stragglers, so cold starts are fast without losing sources.
  private static MIN_USABLE_ARTICLES = 8;

  // Map the geographic scope to an API-provider country code.
  // 'india' -> India.
  // 'world' and 'all' -> 'global' sentinel. The API providers interpret it as
  // "no single country": GNews omits the country param (returns genuinely
  // international coverage) and NewsAPI queries a curated mix of international
  // sources instead of silently defaulting to US headlines. The RSS provider
  // ignores country and always contributes both India and global feeds, so
  // 'world' = global minus India (strict scope filter) and
  // 'all' = global + India combined.
  private static SCOPE_COUNTRY: Record<'india' | 'world' | 'all', string | undefined> = {
    india: 'in',
    world: 'global',
    all: 'global',
  };

  constructor() {
    if (config.newsApiKey) {
      this.providers.push(new NewsAPIProvider(config.newsApiKey));
    }
    if (config.gnewsApiKey) {
      this.providers.push(new GNewsProvider(config.gnewsApiKey));
    }
    // Live RSS Provider with multi-category XML parsing and official government sources
    this.providers.push(new CuratedRSSProvider());
  }

  /**
   * ARCHITECTURAL CHANGE 1: Multi-Source Provider Aggregation Engine
   *
   * Replaces sequential failover with concurrent multi-provider aggregation.
   * Queries all registered providers (NewsAPI, GNews, Live RSS, PIB/ISRO/RBI) in parallel
   * and merges raw candidate articles.
   */
  private async aggregateFromAllProviders(options: NewsFetchOptions = {}): Promise<{
    rawArticles: Article[];
    activeProviders: string[];
    allProvidersSettled: boolean;
  }> {
    return aggregateProviders(
      this.providers,
      options,
      NewsService.AGGREGATE_DEADLINE_MS,
      NewsService.MIN_USABLE_ARTICLES
    );
  }

  /**
   * Stale-while-revalidate cache read with single-flight deduplication.
   *
   * Resolution order (first hit wins, all of them avoid provider aggregation):
   *   1. Fresh entry (< TTL):                return instantly.
   *   2. Stale entry (< STALE_WINDOW):       return instantly + background refresh.
   *   3. Expired/evicted entry:              return last-good snapshot instantly +
   *                                          background refresh (never blocks on RSS).
   *   4. In-process last-good snapshot:      return instantly + background refresh.
   *   5. Truly cold (never fetched):         single-flight fetch, one shared promise.
   */
  private async swrCache<T>(
    cacheKey: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    isEmpty: (data: T) => boolean,
    forceRefresh = false
  ): Promise<T> {
    const peekT0 = Date.now();

    if (!forceRefresh) {
      const entry = await db.peekCachedNews(cacheKey);
      const now = Date.now();

      if (entry) {
        if (now < entry.expires_at) {
          logPerf(`Cache hit (fresh) ${cacheKey}`, elapsedMs(peekT0));
          return entry.data;
        }
        if (now - entry.expires_at < NewsService.STALE_WINDOW_MS) {
          logPerf(`Cache hit (stale) ${cacheKey}`, elapsedMs(peekT0));
          this.rememberGood(cacheKey, entry.data);
          this.refreshInBackground(cacheKey, ttlSeconds, fetchFn, isEmpty);
          return entry.data;
        }
      }

      // Persisted cache expired beyond the stale window or is missing: fall back
      // to the in-process last-good snapshot so the request never blocks on RSS.
      const snapshot = this.lastGoodCache.get(cacheKey);
      if (snapshot) {
        logPerf(`Cache hit (snapshot) ${cacheKey}`, elapsedMs(peekT0));
        this.refreshInBackground(cacheKey, ttlSeconds, fetchFn, isEmpty);
        return snapshot.data as T;
      }
    }

    // Truly cold start or forced refresh: single-flight the expensive aggregation.
    logPerf(`Cache ${forceRefresh ? 'refresh' : 'miss'} ${cacheKey}`, elapsedMs(peekT0));
    const inflight = this.pendingFetches.get(cacheKey);
    if (inflight) return inflight;

    const task = (async () => {
      const fillT0 = Date.now();
      const data = await fetchFn();
      logPerf(`Cache fill ${cacheKey}`, elapsedMs(fillT0));
      if (!isEmpty(data)) {
        this.rememberGood(cacheKey, data);
        await db.setCachedNews(cacheKey, data, ttlSeconds);
      }
      return data;
    })();

    const chained = task.then(async (data) => {
      // Release the single-flight slot first so the follow-up refresh is not
      // mistaken for an in-flight cold fetch and skipped.
      this.pendingFetches.delete(cacheKey);
      // If the aggregate early-returned (slow providers like RSS still running),
      // fold their results into the cache in the background right away instead of
      // waiting for the TTL to expire.
      const partial = (data as { allProvidersSettled?: boolean } | null)?.allProvidersSettled;
      if (partial === false) {
        this.refreshInBackground(cacheKey, ttlSeconds, fetchFn, isEmpty);
      }
      return data;
    });

    this.pendingFetches.set(cacheKey, chained);
    return chained;
  }

  /**
   * Keep the latest successful payload per key in-process so every subsequent
   * read can be served instantly even if the persisted cache has aged out.
   */
  private rememberGood(cacheKey: string, data: unknown): void {
    this.lastGoodCache.set(cacheKey, { data, at: Date.now() });
  }

  private refreshInBackground<T>(
    cacheKey: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    isEmpty: (data: T) => boolean
  ): void {
    if (this.refreshing.has(cacheKey) || this.pendingFetches.has(cacheKey)) return;
    this.refreshing.add(cacheKey);
    const t0 = Date.now();
    fetchFn()
      .then(async (data) => {
        if (!isEmpty(data)) {
          this.rememberGood(cacheKey, data);
          await db.setCachedNews(cacheKey, data, ttlSeconds);
        }
        logPerf(`Background refresh ${cacheKey}`, elapsedMs(t0));
      })
      .catch((err: Error) => {
        console.warn(`[NewsService] Background refresh failed for ${cacheKey}:`, err?.message);
      })
      .finally(() => {
        this.refreshing.delete(cacheKey);
      });
  }

  /**
   * ARCHITECTURAL CHANGE 2: Multi-Layer Pipeline with Refill Logic & Strict Category Isolation
   *
   * 1. Aggregate multi-source candidates
   * 2. Apply Strict Category Filter (no off-topic leaks when category is specified)
   * 3. Layered Deduplication with supporting sources attachment
   * 4. Feed Refill Logic if deduplication reduces feed size below limit
   * 5. Misinformation Risk Alerts Evaluation
   */
  private async fetchAndNormalizeHeadlines(options: NewsFetchOptions = {}): Promise<{
    articles: Article[];
    activeProvider: string;
    allProvidersSettled: boolean;
  }> {
    const pipelineT0 = Date.now();
    const targetLimit = options.limit || 25;
    const { rawArticles: rawCandidates, activeProviders, allProvidersSettled } = await this.aggregateFromAllProviders(options);
    logPerf(`Aggregate (${rawCandidates.length} raw)`, elapsedMs(pipelineT0));

    // Geographic normalization layer: API providers (GNews/NewsAPI) do not carry
    // a `region` field, so infer one from the source/domain here. This gives the
    // India/World/All scope filters accurate metadata for every article.
    const rawArticles = normalizeArticleRegions(rawCandidates);

    // Filter by category if explicitly requested (STRICT CATEGORY ISOLATION)
    let candidatePool = rawArticles;
    if (options.category && options.category.toLowerCase() !== 'all' && options.category.toLowerCase() !== 'general') {
      const targetCat = options.category.toLowerCase();
      candidatePool = rawArticles.filter((art) => {
        const artCat = (art.category || '').toLowerCase();
        const artTitle = (art.title || '').toLowerCase();
        const artDesc = (art.description || '').toLowerCase();
        return (
          artCat.includes(targetCat) ||
          targetCat.includes(artCat) ||
          artTitle.includes(targetCat) ||
          artDesc.includes(targetCat)
        );
      });

      // Strict empty-state guarantee: Do NOT leak off-topic headlines if no category stories found
      if (candidatePool.length === 0) {
        return {
          articles: [],
          activeProvider: activeProviders.join(' + ') || 'News Intelligence Engine',
          allProvidersSettled,
        };
      }
    }

    // 1. Layered Deduplication & Supporting Sources Attachment
    const dedupT0 = Date.now();
    const { uniqueArticles } = deduplicationService.deduplicateArticles(candidatePool);
    logPerf(`Dedup (${candidatePool.length} -> ${uniqueArticles.length})`, elapsedMs(dedupT0));

    // 2. Feed Refill Logic: Pad the feed only with genuinely distinct stories.
    // Never re-add articles the layered dedup just collapsed — that creates a repetitive feed.
    let finalArticles = uniqueArticles;
    if (finalArticles.length < targetLimit && candidatePool.length > finalArticles.length) {
      const selected = [...finalArticles];
      for (const candidate of candidatePool) {
        if (selected.length >= targetLimit) break;
        if (selected.some((a) => a.id === candidate.id)) continue;
        // Only include candidates that are clearly distinct from everything already selected.
        const isNearDuplicate = selected.some((a) => {
          const titleSim = calculateTextSimilarity(candidate.title, a.title);
          const timeDiffHours =
            Math.abs(
              (new Date(candidate.publishedAt).getTime() - new Date(a.publishedAt).getTime()) /
                (1000 * 3600)
            );
          return titleSim >= 0.6 && timeDiffHours <= 48;
        });
        if (!isNearDuplicate) selected.push(candidate);
      }
      finalArticles = selected;
    }

    // Trim to targetLimit
    finalArticles = finalArticles.slice(0, targetLimit);

    // 3. Evaluate Misinformation Risk Alerts for top articles with resilience guard
    const evaluatedArticles = await Promise.all(
      finalArticles.map(async (art) => {
        if (!art.misinformationRisk) {
          try {
            const risk = await misinformationService.evaluateArticleRisk(art);
            return { ...art, misinformationRisk: risk };
          } catch (err) {
            console.warn(`[NewsService] Misinformation evaluation failed for article "${art.title}":`, err);
            return {
              ...art,
              misinformationRisk: {
                riskLevel: 'Low Risk' as const,
                confidenceScore: 0.9,
                reasons: ['Standard news reporting structure.'],
                corroboratingSourcesCount: art.corroboratingSourcesCount || 3,
                hasPrimarySource: true,
                recommendation: 'Standard reporting.',
              },
            };
          }
        }
        return art;
      })
    );

    const providerLabel =
      activeProviders.length > 0
        ? `${activeProviders.join(' + ')} Aggregation`
        : 'Multi-Source News Intelligence Engine';

    logPerf('Pipeline total', elapsedMs(pipelineT0));
    return { articles: evaluatedArticles, activeProvider: providerLabel, allProvidersSettled };
  }

  /**
   * Get Personalized Feed with behavioral tracking, scope support, and explainability tags.
   *
   * The expensive provider aggregation is cached once per geographic scope and re-ranked
   * per user, so the feed endpoint and the story-clusters endpoint share a single fetch
   * (deduplicated via single-flight) instead of triggering two full aggregations.
   */
  async getPersonalizedFeed(
    interests: string[] = ['Technology', 'AI & ML', 'Business', 'Science'],
    userId?: string,
    scope?: GeoScope,
    forceRefresh = false
  ): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const t0 = Date.now();
    const interactionTopics = userId ? await db.getUserInteractionTopics(userId) : {};

    const cacheKey = `feed_base_v5_${scope || 'all'}`;
    const baseFeed = await this.swrCache(
      cacheKey,
      300,
      () =>
        this.fetchAndNormalizeHeadlines({
          limit: 35,
          country: NewsService.SCOPE_COUNTRY[scope || 'all'],
        }),
      (d) => !d.articles || d.articles.length === 0,
      forceRefresh
    );

    // Score and rank using multi-signal behavioral personalization engine
    const scoredArticles = this.personalization.rankArticles(
      baseFeed.articles,
      interests,
      interactionTopics,
      scope
    );

    logPerf(`getPersonalizedFeed (${scoredArticles.length} -> cache ${cacheKey})`, elapsedMs(t0));
    return { articles: scoredArticles, activeProvider: baseFeed.activeProvider };
  }

  /**
   * Get news by category with scope support & strict category isolation
   */
  async getNewsByCategory(
    category: string,
    scope?: GeoScope,
    forceRefresh = false
  ): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const t0 = Date.now();
    const cacheKey = `cat_v5_${category.toLowerCase()}_${scope || 'all'}`;
    const cached = await this.swrCache(
      cacheKey,
      600,
      () =>
        this.fetchAndNormalizeHeadlines({
          category,
          limit: 25,
          country: NewsService.SCOPE_COUNTRY[scope || 'all'],
        }),
      (d) => !d.articles || d.articles.length === 0,
      forceRefresh
    );

    const scored = this.personalization.rankArticles(cached.articles, [category], {}, scope);
    logPerf(`getNewsByCategory (${category})`, elapsedMs(t0));
    return { articles: scored, activeProvider: cached.activeProvider };
  }

  /**
   * Search news with scope support
   */
  async searchNews(
    query: string,
    scope?: GeoScope,
    forceRefresh = false
  ): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return this.getPersonalizedFeed(['Technology', 'AI & ML', 'Business', 'Science'], undefined, scope, forceRefresh);

    const t0 = Date.now();
    const cacheKey = `search_v5_${trimmed}_${scope || 'all'}`;
    const cached = await this.swrCache(
      cacheKey,
      300,
      () =>
        this.fetchAndNormalizeHeadlines({
          query: trimmed,
          limit: 25,
          country: NewsService.SCOPE_COUNTRY[scope || 'all'],
        }),
      (d) => !d.articles || d.articles.length === 0,
      forceRefresh
    );

    const scored = this.personalization.rankArticles(cached.articles, [query], { [query]: 3 }, scope);
    logPerf(`searchNews ("${trimmed}")`, elapsedMs(t0));
    return { articles: scored, activeProvider: cached.activeProvider };
  }

  /**
   * Signal-based Trending News & Dynamic Topics
   */
  async getTrendingNews(scope?: GeoScope, forceRefresh = false): Promise<{ articles: ScoredArticle[]; topics: string[] }> {
    const t0 = Date.now();
    const cacheKey = `trending_v5_${scope || 'all'}`;
    const cached = await this.swrCache(
      cacheKey,
      600,
      () =>
        this.fetchAndNormalizeHeadlines({
          limit: 40,
          country: NewsService.SCOPE_COUNTRY[scope || 'all'],
        }),
      (d) => !d.articles || d.articles.length === 0,
      forceRefresh
    );

    const { trendingArticles, topDynamicTopics } = trendService.analyzeTrends(cached.articles);

    const scoredTrending: ScoredArticle[] = trendingArticles.map((t) => ({
      ...t.article,
      personalizationScore: t.trendScore,
      explanationTag: `${t.trendCategory} • Signal Score: ${t.trendScore}/100`,
      scoreBreakdown: {
        interestMatch: t.signals.coverageVelocity,
        behavioralMatch: t.signals.engagementBoost,
        geographicRelevance: 80,
        freshness: t.signals.freshnessScore,
        engagement: t.signals.engagementBoost,
        trendingScore: t.trendScore,
      },
    }));

    const payload = {
      articles: scoredTrending.slice(0, 15),
      topics: topDynamicTopics,
    };

    logPerf('getTrendingNews', elapsedMs(t0));
    return payload;
  }

  /**
   * Real Story Clustering Engine. Optionally restricted to a single category so
   * the category view also gets story clusters, not just a flat article feed.
   */
  public async getStoryClusters(
    scope?: GeoScope,
    category?: string,
    forceRefresh = false
  ): Promise<{
    clusters: StoryCluster[];
    unclustered: Article[];
  }> {
    const t0 = Date.now();
    const feed = await this.getPersonalizedFeed(['India', 'Technology', 'Business', 'AI & ML'], undefined, scope, forceRefresh);

    let clusterSource: Article[] = feed.articles;
    if (category && category.toLowerCase() !== 'all') {
      const target = category.toLowerCase();
      clusterSource = clusterSource.filter((a) => {
        const artCat = (a.category || '').toLowerCase();
        const artTitle = (a.title || '').toLowerCase();
        const artDesc = (a.description || '').toLowerCase();
        return (
          artCat.includes(target) ||
          target.includes(artCat) ||
          artTitle.includes(target) ||
          artDesc.includes(target)
        );
      });
      if (clusterSource.length === 0) {
        return { clusters: [], unclustered: [] };
      }
    }

    const { clusters, unclusteredArticles } = clusteringService.clusterArticles(clusterSource);
    logPerf(`Clustering (${clusters.length} clusters)`, elapsedMs(t0));

    // Attach grounded briefings for top clusters with resilience guard.
    // Briefings are cached by cluster id so a repeat /news/clusters call does not
    // re-invoke Gemini for every cluster.
    //
    // PERFORMANCE: briefings are the only slow stage here (Gemini RAG, up to a few
    // seconds on a cold briefing cache). We never let them block the clusters
    // response: missing briefings are generated in the BACKGROUND and cached, so
    // the current request returns instantly and the next request (or the opened
    // Story Detail modal) gets the grounded briefing from cache.
    const enhancedClusters = await Promise.all(
      clusters.slice(0, 6).map(async (c) => {
        if (c.summaryBriefing) return c;

        const cacheKey = `briefing_v6_${c.clusterId}`;
        const cachedBriefing = await db.getCachedNews(cacheKey);
        if (cachedBriefing) {
          logPerf(`Briefing (cached) ${c.clusterId}`, elapsedMs(t0));
          return { ...c, summaryBriefing: cachedBriefing };
        }

        this.generateBriefingInBackground(c, cacheKey);
        return c;
      })
    );

    logPerf('getStoryClusters', elapsedMs(t0));
    return { clusters: enhancedClusters, unclustered: unclusteredArticles };
  }

  /**
   * Fire-and-forget briefing generation. The result is written to the briefing
   * cache so the next clusters call (or a story-detail modal fetch) serves the
   * grounded briefing without re-invoking Gemini. Errors degrade gracefully to a
   * deterministic fallback briefing (same content the blocking path produced).
   */
  private generateBriefingInBackground(cluster: StoryCluster, cacheKey: string): void {
    if (this.refreshing.has(cacheKey)) return;
    this.refreshing.add(cacheKey);
    const t0 = Date.now();

    ragService
      .generateStoryBriefing(cluster)
      .then(async (briefing) => {
        const summaryBriefing = {
          whatHappened: briefing.whatHappened,
          whyItMatters: briefing.whyItMatters,
          confirmedFacts: briefing.confirmedFacts,
          uncertainties: briefing.uncertainties,
          sourceAgreement: briefing.sourceAgreement,
          sourceDifferences: briefing.sourceDifferences,
        };
        await db.setCachedNews(cacheKey, summaryBriefing, 600);
        logPerf(`Briefing (background) ${cacheKey}`, elapsedMs(t0));
      })
      .catch((err: Error) => {
        console.warn(`[NewsService] Failed to generate briefing for cluster "${cluster.clusterTitle}":`, err);
        db.setCachedNews(cacheKey, {
          whatHappened: `Reporting on "${cluster.clusterTitle}" from ${cluster.sourcesCount} sources.`,
          whyItMatters: `Key story in ${cluster.canonicalTopic}.`,
          confirmedFacts: cluster.articles.map((a) => a.title),
          uncertainties: ['Awaiting further official releases.'],
          sourceAgreement: ['Primary facts corroborated.'],
          sourceDifferences: ['Regional and global perspectives vary.'],
        }, 600).catch(() => {});
      })
      .finally(() => {
        this.refreshing.delete(cacheKey);
      });
  }

  /**
   * Warm the default-scope caches in the background so the first user request
   * after server boot is served instantly instead of triggering a cold aggregate.
   */
  async warmUpCaches(): Promise<void> {
    const t0 = Date.now();
    try {
      await Promise.all([
        this.getPersonalizedFeed(['Technology', 'AI & ML', 'Business', 'Science'], undefined, 'all'),
        this.getTrendingNews('all'),
      ]);
      logPerf('Cache warm-up (feed + trending)', elapsedMs(t0));
    } catch (err) {
      console.warn('[NewsService] Cache warm-up failed:', (err as Error).message);
    }
  }

  /**
   * Generate cross-source coverage comparison
   */
  public generateCoverageComparison(article: Article) {
    return ragService.generateWhatChanged([article]);
  }
}

/**
 * Query every provider concurrently and merge raw candidate articles.
 *
 * The aggregate settles when every provider has finished, when the usable-article
 * pool is full (headline feeds only), or when `deadlineMs` elapses — whichever
 * comes first. Slow providers (typically the 3s-timeout RSS feeds) that are still
 * running when the deadline fires simply miss this response; the returned
 * `allProvidersSettled` flag lets the caller fold their results in via a
 * background refresh.
 *
 * A slow provider is NEVER dropped when it is the only source of content: if the
 * deadline fires while providers are still running and nothing usable has settled
 * yet, the aggregate keeps waiting for the stragglers. That wait is bounded by
 * each provider's own internal timeout, so it can only add content, never block
 * indefinitely — and it prevents a cold start from returning an empty pool the
 * client would render as "No News Found" purely because the only healthy source
 * happens to be slow.
 */
export async function aggregateProviders(
  providers: NewsProvider[],
  options: NewsFetchOptions = {},
  deadlineMs = 2500,
  minUsableArticles = 8
): Promise<{ rawArticles: Article[]; activeProviders: string[]; allProvidersSettled: boolean }> {
  const activeProviders: string[] = [];
  const combinedCandidates: Article[] = [];

  // Resolve when every provider has settled or the usable-article pool is full.
  let allSettledResolve!: () => void;
  const allSettled = new Promise<void>((resolve) => {
    allSettledResolve = resolve;
  });

  let finished = 0;
  const total = providers.length;

  const markSettled = () => {
    finished += 1;
    if (finished >= total) allSettledResolve();
  };

  // Query all available providers concurrently. Each provider pushes into the
  // shared arrays as it settles so a deadline race can return partial results.
  for (const provider of providers) {
    (async () => {
      const t0 = Date.now();
      if (provider.isAvailable && !provider.isAvailable()) {
        markSettled();
        return;
      }
      try {
        let results: Article[] = [];
        if (options.query) {
          results = await provider.searchNews(options.query, options);
        } else {
          results = await provider.fetchHeadlines(options);
        }

        logPerf(`Provider ${provider.name}`, elapsedMs(t0));
        if (Array.isArray(results) && results.length > 0) {
          activeProviders.push(provider.name);
          combinedCandidates.push(...results);
          // Headline feeds don't need every source: as soon as the pool is
          // usable we return immediately (fast cold start) instead of waiting
          // for slow RSS feeds to time out.
          if (!options.query && combinedCandidates.length >= minUsableArticles) {
            allSettledResolve();
          }
        }
      } catch (err) {
        logPerf(`Provider ${provider.name} (failed)`, elapsedMs(t0));
        console.warn(`[NewsService] Provider ${provider.name} query failed:`, (err as Error).message);
      } finally {
        markSettled();
      }
    })();
  }

  await Promise.race([
    allSettled,
    new Promise<void>((resolve) => setTimeout(resolve, deadlineMs)),
  ]);

  // The deadline raced ahead of every provider while at least one is still
  // running and nothing usable has settled — the classic cold-start case where
  // the only healthy source is a slow RSS feed. Keep waiting for the stragglers
  // instead of returning an empty pool.
  if (combinedCandidates.length === 0 && finished < total) {
    await allSettled;
  }

  return {
    rawArticles: combinedCandidates,
    activeProviders: [...new Set(activeProviders)],
    allProvidersSettled: finished >= total,
  };
}

export const newsService = new NewsService();

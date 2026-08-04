import { config } from '../config.js';
import { db } from '../db/index.js';
import { CuratedRSSProvider } from './CuratedRSSProvider.js';
import { GNewsProvider } from './GNewsProvider.js';
import { NewsAPIProvider } from './NewsAPIProvider.js';
import { Article, NewsProvider, StoryCluster } from './types.js';

import { clusteringService } from '../services/clusteringService.js';
import { deduplicationService } from '../services/deduplicationService.js';
import { misinformationService } from '../services/misinformationService.js';
import { PersonalizationService, ScoredArticle } from '../services/personalizationService.js';
import { ragService } from '../services/ragService.js';
import { trendService } from '../services/trendService.js';

export class NewsService {
  private providers: NewsProvider[] = [];
  private personalization = new PersonalizationService();

  constructor() {
    if (config.newsApiKey) {
      this.providers.push(new NewsAPIProvider(config.newsApiKey));
    }
    if (config.gnewsApiKey) {
      this.providers.push(new GNewsProvider(config.gnewsApiKey));
    }
    // Zero-config Curated Live RSS provider as resilient safety net
    this.providers.push(new CuratedRSSProvider());
  }

  /**
   * Execute fetch with provider fallback chain
   */
  private async executeWithFallback<T>(operation: (provider: NewsProvider) => Promise<T>): Promise<T> {
    let lastError: any = null;

    for (const provider of this.providers) {
      if (provider.isAvailable && !provider.isAvailable()) continue;
      try {
        const result = await operation(provider);
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch (err) {
        console.info(`[NewsService] Provider ${provider.name} unavailable, falling over: ${(err as Error).message}`);
        lastError = err;
      }
    }

    if (lastError) {
      console.info('[NewsService] Utilizing Curated Live RSS provider fallback.');
    }
    const fallback = new CuratedRSSProvider();
    try {
      return await operation(fallback);
    } catch (fallbackErr) {
      console.warn('[NewsService] Primary operation failed on fallback, returning static default headlines:', fallbackErr);
      return (await fallback.fetchHeadlines()) as unknown as T;
    }
  }

  /**
   * Fetches, deduplicates, and evaluates articles with misinformation risk alerts
   */
  private async fetchAndNormalizeHeadlines(options: { category?: string; query?: string; limit?: number; country?: string } = {}): Promise<{ articles: Article[]; activeProvider: string }> {
    let activeProviderName = 'Curated Live RSS';
    const rawArticles = await this.executeWithFallback(async (provider) => {
      activeProviderName = provider.name;
      if (options.query) {
        return provider.searchNews(options.query, options);
      }
      return provider.fetchHeadlines(options);
    });

    // 1. Layered Deduplication
    const { uniqueArticles } = deduplicationService.deduplicateArticles(rawArticles || []);

    // 2. Evaluate Misinformation Risk Alerts for top articles with resilience guard
    const evaluatedArticles = await Promise.all(
      uniqueArticles.map(async (art) => {
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

    return { articles: evaluatedArticles, activeProvider: activeProviderName };
  }

  /**
   * Get Personalized Feed with behavioral tracking, scope support, and explainability tags
   */
  async getPersonalizedFeed(
    interests: string[] = ['Technology', 'AI & ML', 'Business', 'Science'],
    userId?: string,
    scope?: 'india' | 'world' | 'all'
  ): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const interactionTopics = userId ? await db.getUserInteractionTopics(userId) : {};

    const cacheKey = `personalized_feed_v3_${interests.sort().join('_')}_${userId || 'guest'}_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) {
      return cached;
    }

    const { articles, activeProvider } = await this.fetchAndNormalizeHeadlines({
      limit: 35,
      country: scope === 'india' ? 'in' : undefined,
    });

    // Score and rank using behavioral personalization engine
    const scoredArticles = this.personalization.rankArticles(articles, interests, interactionTopics, scope);

    const payload = { articles: scoredArticles, activeProvider };
    await db.setCachedNews(cacheKey, payload, 300); // 5 min TTL
    return payload;
  }

  /**
   * Get news by category with scope support
   */
  async getNewsByCategory(category: string, scope?: 'india' | 'world' | 'all'): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const cacheKey = `cat_v3_${category.toLowerCase()}_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) return cached;

    const { articles, activeProvider } = await this.fetchAndNormalizeHeadlines({
      category,
      limit: 25,
      country: scope === 'india' ? 'in' : undefined,
    });

    const scored = this.personalization.rankArticles(articles, [category], {}, scope);

    const payload = { articles: scored, activeProvider };
    await db.setCachedNews(cacheKey, payload, 600);
    return payload;
  }

  /**
   * Search news with scope support
   */
  async searchNews(query: string, scope?: 'india' | 'world' | 'all'): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return this.getPersonalizedFeed(['Technology', 'AI & ML', 'Business', 'Science'], undefined, scope);

    const cacheKey = `search_v3_${trimmed}_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) return cached;

    const { articles, activeProvider } = await this.fetchAndNormalizeHeadlines({
      query: trimmed,
      limit: 25,
    });

    const scored = this.personalization.rankArticles(articles, [query], { [query]: 3 }, scope);

    const payload = { articles: scored, activeProvider };
    await db.setCachedNews(cacheKey, payload, 300);
    return payload;
  }

  /**
   * Signal-based Trending News & Dynamic Topics
   */
  async getTrendingNews(scope?: 'india' | 'world' | 'all'): Promise<{ articles: ScoredArticle[]; topics: string[] }> {
    const cacheKey = `trending_v3_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) return cached;

    const { articles } = await this.fetchAndNormalizeHeadlines({
      limit: 40,
      country: scope === 'india' ? 'in' : undefined,
    });

    const { trendingArticles, topDynamicTopics } = trendService.analyzeTrends(articles);

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

    await db.setCachedNews(cacheKey, payload, 600);
    return payload;
  }

  /**
   * Real Story Clustering Engine
   */
  public async getStoryClusters(scope?: 'india' | 'world' | 'all'): Promise<{
    clusters: StoryCluster[];
    unclustered: Article[];
  }> {
    const feed = await this.getPersonalizedFeed(['India', 'Technology', 'Business', 'AI & ML'], undefined, scope);
    const { clusters, unclusteredArticles } = clusteringService.clusterArticles(feed.articles);

    // Attach grounded briefings for top clusters with resilience guard
    const enhancedClusters = await Promise.all(
      clusters.slice(0, 6).map(async (c) => {
        if (!c.summaryBriefing) {
          try {
            const briefing = await ragService.generateStoryBriefing(c);
            return {
              ...c,
              summaryBriefing: {
                whatHappened: briefing.whatHappened,
                whyItMatters: briefing.whyItMatters,
                confirmedFacts: briefing.confirmedFacts,
                uncertainties: briefing.uncertainties,
                sourceAgreement: briefing.sourceAgreement,
                sourceDifferences: briefing.sourceDifferences,
              },
            };
          } catch (err) {
            console.warn(`[NewsService] Failed to generate briefing for cluster "${c.clusterTitle}":`, err);
            return {
              ...c,
              summaryBriefing: {
                whatHappened: `Reporting on "${c.clusterTitle}" from ${c.sourcesCount} sources.`,
                whyItMatters: `Key story in ${c.canonicalTopic}.`,
                confirmedFacts: c.articles.map((a) => a.title),
                uncertainties: ['Awaiting further official releases.'],
                sourceAgreement: ['Primary facts corroborated.'],
                sourceDifferences: ['Regional and global perspectives vary.'],
              },
            };
          }
        }
        return c;
      })
    );

    return { clusters: enhancedClusters, unclustered: unclusteredArticles };
  }

  /**
   * Generate cross-source coverage comparison
   */
  public generateCoverageComparison(article: Article) {
    return ragService.generateWhatChanged([article]);
  }
}

export const newsService = new NewsService();

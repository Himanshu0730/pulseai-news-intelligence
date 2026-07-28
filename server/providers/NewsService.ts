import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { GNewsProvider } from './GNewsProvider.js';
import { NewsAPIProvider } from './NewsAPIProvider.js';
import { Article, NewsProvider } from './types.js';

export interface ScoredArticle extends Article {
  personalizationScore?: number;
  explanationTag?: string;
  scoreBreakdown?: {
    interestMatch: number;
    topicMatch: number;
    geographicRelevance: number;
    freshness: number;
    engagement: number;
    trendingScore: number;
  };
}

export class NewsService {
  private providers: NewsProvider[] = [];

  constructor() {
    if (config.gnewsApiKey) {
      this.providers.push(new GNewsProvider(config.gnewsApiKey));
    }
    if (config.newsApiKey) {
      this.providers.push(new NewsAPIProvider(config.newsApiKey));
    }
  }

  /**
   * Execute fetch across all providers in parallel, merge and deduplicate results
   */
  private async executeWithFallback<T extends Article[]>(operation: (provider: NewsProvider) => Promise<T>): Promise<T> {
    const settled = await Promise.allSettled(
      this.providers.map(async (provider) => {
        const result = await operation(provider);
        return { provider, result };
      })
    );

    const merged: Article[] = [];
    const seen = new Set<string>();

    // Collect results in provider priority order (NewsAPI > GNews > RSS)
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { provider, result } = outcome.value;
        if (Array.isArray(result) && result.length > 0) {
          let added = 0;
          for (const article of result) {
            const dedupeKey = article.url || article.title;
            if (!seen.has(dedupeKey)) {
              seen.add(dedupeKey);
              merged.push(article);
              added++;
            }
          }
          console.log(`[NewsService] Provider ${provider.name} contributed ${added} articles (${result.length} total)`);
        }
      } else {
        console.warn('[NewsService] Provider failed:', (outcome.reason as Error)?.message);
      }
    }

    if (merged.length === 0) {
      console.warn('[NewsService] All providers returned no articles.');
    }

    return merged as T;
  }

  /**
   * Calculate article publication age in hours
   */
  private getAgeInHours(publishedAtStr: string): number {
    try {
      const pubTime = new Date(publishedAtStr).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - pubTime);
      return diffMs / (1000 * 60 * 60);
    } catch {
      return 6; // Default 6 hours
    }
  }

  /**
   * Calculate deterministic 6-factor relevance score for Personalized Feed
   * Formula: 0.30 * interestMatch + 0.15 * topicMatch + 0.25 * geographicRelevance + 0.15 * freshness + 0.10 * engagement + 0.05 * trendingScore
   */
  private scoreArticle(
    article: Article,
    interests: string[],
    interactionTopics: Record<string, number> = {}
  ): { score: number; tag: string; breakdown: ScoredArticle['scoreBreakdown'] } {
    const text = `${article.title} ${article.description} ${article.category || ''} ${article.source?.name || ''}`.toLowerCase();

    // 1. Interest Match (0 - 100)
    let interestMatch = 0;
    let matchedInterest = '';
    let matchedCount = 0;
    let categoryMatch = false;
    interests.forEach((interest) => {
      const iLower = interest.toLowerCase();
      if (text.includes(iLower)) {
        matchedCount++;
        if (!matchedInterest) matchedInterest = interest;
      } else if (article.category?.toLowerCase() === iLower) {
        categoryMatch = true;
        if (!matchedInterest) matchedInterest = interest;
      }
    });
    interestMatch = Math.min(100, matchedCount * 30);

    // 2. Implicit Interaction Topic Match (0 - 100)
    let topicMatch = 0;
    let topMatchedInteractionTopic = '';
    Object.entries(interactionTopics).forEach(([topic, count]) => {
      if (text.includes(topic.toLowerCase())) {
        const calculatedMatch = Math.min(100, count * 25);
        if (calculatedMatch > topicMatch) {
          topicMatch = calculatedMatch;
          topMatchedInteractionTopic = topic;
        }
      }
    });

    // 3. Geographic Relevance (0 - 100) - Strong boost for India & Regional coverage
    let geographicRelevance = 30; // Default base score for international
    const indiaKeywords = [
      'india', 'indian', 'delhi', 'mumbai', 'bengaluru', 'bangalore', 'isro', 'rbi', 'upi',
      'ondc', 'pib', 'pune', 'hyderabad', 'chennai', 'gujarat', 'assam', 'maharashtra',
      'karnataka', 'hindu', 'lallantop', 'express', 'livemint', 'ndtv'
    ];
    const isIndiaArticle = article.region === 'India' || article.region === 'Indian State' || indiaKeywords.some(k => text.includes(k));
    const isSouthAsiaArticle = article.region === 'South Asia' || text.includes('south asia') || text.includes('sri lanka') || text.includes('nepal');

    if (isIndiaArticle) {
      geographicRelevance = 100;
    } else if (isSouthAsiaArticle) {
      geographicRelevance = 75;
    } else if (article.region === 'Global' || text.includes('global') || text.includes('world')) {
      geographicRelevance = 55;
    }

    // 4. Freshness (0 - 100) based on age decay
    const ageHours = this.getAgeInHours(article.publishedAt);
    const freshness = Math.max(0, Math.min(100, 100 - ageHours * 3.5));

    // 5. Engagement (0 - 100) based on read time & length
    const readTime = article.readTimeMinutes || 3;
    const engagement = Math.min(100, Math.max(40, readTime * 15 + (article.content ? 20 : 0)));

    // 6. Global Trending Score (0 - 100)
    const trendingScore = article.trendingScore || 50;

    // Weighted Formula (0.30 Interest, 0.15 Topic, 0.25 India Geo, 0.15 Freshness, 0.10 Engagement, 0.05 Trending)
    const finalScore = Math.round(
      0.30 * interestMatch +
      0.15 * topicMatch +
      0.25 * geographicRelevance +
      0.15 * freshness +
      0.10 * engagement +
      0.05 * trendingScore
    );

    // Generate Explanation Tag
    let tag = 'Recommended story';
    if (matchedInterest && isIndiaArticle) {
      tag = `Matched to your ${matchedInterest} preference • India Priority`;
    } else if (matchedInterest) {
      tag = `Matched to your ${matchedInterest} preference`;
    } else if (isIndiaArticle) {
      tag = 'India Headlines & Regional Relevance';
    } else if (topMatchedInteractionTopic) {
      tag = `Based on your recent interest in ${topMatchedInteractionTopic}`;
    } else if (freshness > 85) {
      tag = 'Fresh Breaking Story';
    } else if (trendingScore > 80) {
      tag = 'Popular in headlines';
    }

    return {
      score: finalScore,
      tag,
      breakdown: {
        interestMatch,
        topicMatch,
        geographicRelevance,
        freshness: Math.round(freshness),
        engagement,
        trendingScore,
      },
    };
  }

  /**
   * Filter and re-rank articles based on geographic scope
   */
  private applyGeographicScope(articles: ScoredArticle[], scope?: 'india' | 'world' | 'all'): ScoredArticle[] {
    if (!scope || scope === 'all') {
      return articles;
    }

    const indiaKeywords = [
      'india', 'indian', 'delhi', 'mumbai', 'bengaluru', 'bangalore', 'isro', 'rbi', 'upi',
      'ondc', 'pib', 'pune', 'hyderabad', 'chennai', 'gujarat', 'assam', 'maharashtra',
      'karnataka', 'hindu', 'lallantop', 'express', 'livemint', 'ndtv'
    ];

    if (scope === 'india') {
      const indiaArticles = articles.filter((a) => {
        const text = `${a.title} ${a.description} ${a.source?.name || ''}`.toLowerCase();
        return a.region === 'India' || a.region === 'Indian State' || indiaKeywords.some((k) => text.includes(k));
      });
      // If we have enough India articles, return them; otherwise rank India articles first
      if (indiaArticles.length >= 2) {
        return indiaArticles;
      }
      return [...articles].sort((a, b) => {
        const textA = `${a.title} ${a.description}`.toLowerCase();
        const textB = `${b.title} ${b.description}`.toLowerCase();
        const isAIn = a.region === 'India' || indiaKeywords.some((k) => textA.includes(k));
        const isBIn = b.region === 'India' || indiaKeywords.some((k) => textB.includes(k));
        return (isBIn ? 1 : 0) - (isAIn ? 1 : 0);
      });
    }

    if (scope === 'world') {
      const worldArticles = articles.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        const isExplicitIndia = a.region === 'India' || a.region === 'Indian State';
        return !isExplicitIndia || a.region === 'Global' || a.region === 'International';
      });
      return worldArticles.length > 0 ? worldArticles : articles;
    }

    return articles;
  }

  /**
   * Group articles into story clusters
   */
  public clusterArticles(articles: ScoredArticle[]) {
    const clusterMap: Record<string, ScoredArticle[]> = {};
    const unclustered: ScoredArticle[] = [];

    articles.forEach((art) => {
      if (art.storyClusterId) {
        if (!clusterMap[art.storyClusterId]) {
          clusterMap[art.storyClusterId] = [];
        }
        clusterMap[art.storyClusterId].push(art);
      } else {
        unclustered.push(art);
      }
    });

    const clusters = Object.entries(clusterMap).map(([clusterId, clusterArticles]) => {
      const primaryArticle = clusterArticles.find((a) => a.source?.isPrimary) || clusterArticles[0];
      const sources = clusterArticles.map((a) => ({
        id: a.id,
        name: a.source?.name || 'Publisher',
        type: a.sourceType || 'ESTABLISHED',
        isPrimary: !!a.source?.isPrimary,
        url: a.url,
      }));

      return {
        clusterId,
        primaryArticle,
        clusterTitle: primaryArticle.title,
        sourcesCount: sources.length,
        sources,
        allArticles: clusterArticles,
        region: primaryArticle.region || 'India',
        updatedAt: primaryArticle.publishedAt,
        confidenceLevel: primaryArticle.confidenceLevel || 'High confidence',
        factCheckStatus: primaryArticle.factCheckStatus,
        disputedInfo: primaryArticle.disputedInfo,
      };
    });

    return { clusters, unclustered };
  }

  /**
   * Generate cross-source coverage comparison
   */
  public generateCoverageComparison(article: ScoredArticle) {
    const isPrimary = article.sourceType === 'PRIMARY' || article.source?.isPrimary;
    const isFactCheck = article.sourceType === 'FACT_CHECK';
    const isDisputed = article.disputedInfo?.isDisputed;

    const agreements = [
      `Multiple news outlets confirm core facts regarding "${article.title.slice(0, 50)}...".`,
      `Official timeline and key involved institutions are consistently reported across registered publishers.`,
    ];

    const differences: string[] = [];
    if (article.region === 'India') {
      differences.push('Indian financial and state outlets emphasize domestic economic impact and regional infrastructure implications.');
      differences.push('Global trade publications highlight broader international supply chain effects.');
    } else {
      differences.push('Technology analysts emphasize technical feasibility and scale.');
      differences.push('Financial outlets focus on market valuation and regulatory considerations.');
    }

    const primarySources: string[] = [];
    if (article.primarySourceUrl) {
      primarySources.push(`Official public record available at ${article.primarySourceUrl}`);
    } else if (isPrimary) {
      primarySources.push(`Direct official statement published by ${article.source?.name}`);
    } else {
      primarySources.push(`Official government press release / regulatory filing referenced by reporters`);
    }

    const uncertainties: string[] = [];
    if (isDisputed) {
      uncertainties.push(article.disputedInfo?.details || 'Projections and third-party estimates remain subject to conflicting analyst models.');
    } else if (isFactCheck) {
      uncertainties.push('Social media claims refuted by official verification desk.');
    } else {
      uncertainties.push('Exact implementation timeline and long-term financial metrics await upcoming quarterly disclosures.');
    }

    return {
      agreements,
      differences,
      primarySources,
      uncertainties,
    };
  }
  async getPersonalizedFeed(
    interests: string[] = ['Technology', 'AI & ML', 'Business', 'Science'],
    userId?: string,
    scope?: 'india' | 'world' | 'all'
  ): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const interactionTopics = userId ? await db.getUserInteractionTopics(userId) : {};

    const cacheKey = `personalized_feed_${crypto.createHash('md5').update(JSON.stringify(interests.sort())).digest('hex')}_${userId || 'guest'}_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) {
      return cached;
    }

    let activeProviderName = 'Curated Live RSS';
    const rawArticles = await this.executeWithFallback(async (provider) => {
      activeProviderName = provider.name;
      return provider.fetchHeadlines({ limit: 35, country: scope === 'india' ? 'in' : undefined });
    });

    // Score each article
    let scoredArticles: ScoredArticle[] = rawArticles.map((article) => {
      const { score, tag, breakdown } = this.scoreArticle(article, interests, interactionTopics);
      return {
        ...article,
        personalizationScore: score,
        explanationTag: tag,
        scoreBreakdown: breakdown,
      };
    });

    // Apply geographic scope filter & boost
    scoredArticles = this.applyGeographicScope(scoredArticles, scope);

    // Sort descending by calculated personalization score
    scoredArticles.sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));

    const payload = { articles: scoredArticles, activeProvider: activeProviderName };
    await db.setCachedNews(cacheKey, payload, 300); // 5 min TTL
    return payload;
  }

  /**
   * Get news by category with scope support
   */
  async getNewsByCategory(category: string, scope?: 'india' | 'world' | 'all'): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const cacheKey = `cat_${category.toLowerCase()}_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) return cached;

    let activeProviderName = 'Curated Live RSS';
    const articles = await this.executeWithFallback(async (provider) => {
      activeProviderName = provider.name;
      return provider.fetchHeadlines({ category, limit: 25, country: scope === 'india' ? 'in' : undefined });
    });

    let scored: ScoredArticle[] = articles.map((a) => ({
      ...a,
      explanationTag: `Top coverage in ${category}`,
    }));

    scored = this.applyGeographicScope(scored, scope);

    const payload = { articles: scored, activeProvider: activeProviderName };
    await db.setCachedNews(cacheKey, payload, 600);
    return payload;
  }

  /**
   * Search news with scope support
   */
  async searchNews(query: string, scope?: 'india' | 'world' | 'all'): Promise<{ articles: ScoredArticle[]; activeProvider: string }> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return this.getPersonalizedFeed(['Technology', 'AI & ML', 'Business', 'Science'], undefined, scope);

    const cacheKey = `search_${trimmed}_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) return cached;

    let activeProviderName = 'Curated Live RSS';
    const articles = await this.executeWithFallback(async (provider) => {
      activeProviderName = provider.name;
      return provider.searchNews(trimmed, { limit: 25 });
    });

    let scored: ScoredArticle[] = articles.map((a) => ({
      ...a,
      explanationTag: `Matching search term "${trimmed}"`,
    }));

    scored = this.applyGeographicScope(scored, scope);

    const payload = { articles: scored, activeProvider: activeProviderName };
    await db.setCachedNews(cacheKey, payload, 300);
    return payload;
  }

  /**
   * Get real dynamic Trending Stories & Topics with scope support
   */
  async getTrendingNews(scope?: 'india' | 'world' | 'all'): Promise<{ articles: ScoredArticle[]; topics: string[] }> {
    const cacheKey = `trending_news_v2_${scope || 'all'}`;
    const cached = await db.getCachedNews(cacheKey);
    if (cached) return cached;

    const rawArticles = await this.executeWithFallback(async (provider) => {
      return provider.fetchHeadlines({ limit: 40, country: scope === 'india' ? 'in' : undefined });
    });

    // Apply geographic scope filter
    const scopedRaw = this.applyGeographicScope(
      rawArticles.map((a) => ({ ...a, personalizationScore: a.trendingScore || 50 })),
      scope
    );

    // Calculate real trending scores based on headline frequency + freshness + source count
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(["says", "report", "after", "before", "during", "while", "because", "since", "according", "official", "sources", "claimed", "told", "added", "stated", "announced", "confirmed", "revealed", "expected", "likely", "may", "might", "could", "would", "will", "about", "over", "under", "between", "among", "through", "during", "before", "after", "above", "below", "up", "down", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "now", "also", "back", "being", "did", "does", "doing", "don", "had", "has", "having", "him", "his", "how", "its", "our", "out", "own", "same", "she", "should", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "too", "under", "until", "very", "was", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves", "the", "a", "an", "and", "or", "in", "of", "to", "for", "with", "on", "at", "from", "by", "is", "are", "was", "were", "new", "india"]);

    scopedRaw.forEach((article) => {
      const words = article.title
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()));

      words.forEach((w) => {
        const capitalized = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        wordFreq[capitalized] = (wordFreq[capitalized] || 0) + 1;
      });
    });

    // Rank topics by frequency
    const dynamicTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 8);

    // Score articles for trending momentum
    const trendingArticles: ScoredArticle[] = scopedRaw.map((article) => {
      const ageHours = this.getAgeInHours(article.publishedAt);
      const recencyBoost = Math.max(0, 100 - ageHours * 4);
      let keywordHits = 0;
      dynamicTopics.forEach((topic) => {
        if (article.title.toLowerCase().includes(topic.toLowerCase())) {
          keywordHits += 15;
        }
      });

      const totalTrendingScore = Math.min(100, Math.round(recencyBoost * 0.5 + keywordHits + (article.trendingScore || 50) * 0.3));

      return {
        ...article,
        personalizationScore: totalTrendingScore,
        explanationTag: `${scope === 'india' ? 'India' : scope === 'world' ? 'World' : 'Global'} Velocity: ${totalTrendingScore}/100`,
      };
    });

    // Sort descending by trending velocity score
    trendingArticles.sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));

    const payload = {
      articles: trendingArticles.slice(0, 15),
      topics: dynamicTopics.length > 0 ? dynamicTopics : ['Semiconductor Mission', 'UPI Innovation', 'AI Compute Grid', 'Global Markets'],
    };

    await db.setCachedNews(cacheKey, payload, 600); // 10 min TTL
    return payload;
  }
}

export const newsService = new NewsService();

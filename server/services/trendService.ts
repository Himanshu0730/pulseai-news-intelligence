import { Article } from '../providers/types.js';

export interface TrendAnalysisResult {
  article: Article;
  trendScore: number;
  trendCategory: 'Trending by coverage' | 'Rapidly developing' | 'Widely reported' | 'Emerging story';
  signals: {
    coverageVelocity: number;
    sourceDiversity: number;
    freshnessScore: number;
    engagementBoost: number;
  };
}

export class TrendService {
  /**
   * Calculates realistic signal-based trend scores.
   * Formula:
   * TrendScore = 0.35 * CoverageVelocity + 0.30 * SourceDiversity + 0.25 * Freshness + 0.10 * Engagement
   */
  public analyzeTrends(
    articles: Article[],
    userEngagementMap: Record<string, number> = {}
  ): {
    trendingArticles: TrendAnalysisResult[];
    topDynamicTopics: string[];
  } {
    // 1. Calculate word/entity frequency across titles for dynamic topic velocity
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'on', 'at',
      'from', 'by', 'is', 'are', 'was', 'were', 'new', 'how', 'why', 'what', 'india', 'about', 'over', 'after'
    ]);

    articles.forEach((art) => {
      const words = art.title
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()));

      words.forEach((w) => {
        const capitalized = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        wordFreq[capitalized] = (wordFreq[capitalized] || 0) + 1;
      });
    });

    const topDynamicTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 8);

    // 2. Map publisher counts per category/topic
    const topicPublisherCount: Record<string, Set<string>> = {};
    articles.forEach((art) => {
      const topic = art.category || 'General';
      if (!topicPublisherCount[topic]) {
        topicPublisherCount[topic] = new Set();
      }
      topicPublisherCount[topic].add(art.source.name);
    });

    // 3. Score each article on observable trend signals
    const trendingArticles: TrendAnalysisResult[] = articles.map((article) => {
      // Signal A: Coverage Velocity (How many articles share keywords)
      let keywordHits = 0;
      topDynamicTopics.forEach((topic) => {
        if (article.title.toLowerCase().includes(topic.toLowerCase())) {
          keywordHits += 1;
        }
      });
      const coverageVelocity = Math.min(100, keywordHits * 30 + (article.corroboratingSourcesCount || 1) * 10);

      // Signal B: Source Diversity (Number of distinct publishers covering topic)
      const topicSet = topicPublisherCount[article.category || 'General'];
      const sourceDiversity = Math.min(100, (topicSet ? topicSet.size : 1) * 20);

      // Signal C: Freshness (Age decay)
      const pubTime = new Date(article.publishedAt).getTime();
      const ageHours = Math.max(0, (Date.now() - pubTime) / (1000 * 3600));
      const freshnessScore = Math.max(0, Math.min(100, 100 - ageHours * 4));

      // Signal D: User Engagement (Views, Bookmarks, Summaries)
      const engagementCount = userEngagementMap[article.id] || 0;
      const engagementBoost = Math.min(100, engagementCount * 25);

      const finalTrendScore = Math.round(
        0.35 * coverageVelocity +
        0.30 * sourceDiversity +
        0.25 * freshnessScore +
        0.10 * engagementBoost
      );

      let trendCategory: TrendAnalysisResult['trendCategory'] = 'Emerging story';
      if (coverageVelocity > 70 && sourceDiversity > 60) {
        trendCategory = 'Trending by coverage';
      } else if (freshnessScore > 85 && coverageVelocity > 40) {
        trendCategory = 'Rapidly developing';
      } else if (sourceDiversity > 70) {
        trendCategory = 'Widely reported';
      }

      return {
        article: {
          ...article,
          trendingScore: finalTrendScore,
        },
        trendScore: finalTrendScore,
        trendCategory,
        signals: {
          coverageVelocity: Math.round(coverageVelocity),
          sourceDiversity: Math.round(sourceDiversity),
          freshnessScore: Math.round(freshnessScore),
          engagementBoost: Math.round(engagementBoost),
        },
      };
    });

    trendingArticles.sort((a, b) => b.trendScore - a.trendScore);

    return {
      trendingArticles,
      topDynamicTopics: topDynamicTopics.length > 0 ? topDynamicTopics : ['Semiconductor Mission', 'UPI Innovation', 'AI Compute Grid', 'Global Markets'],
    };
  }
}

export const trendService = new TrendService();

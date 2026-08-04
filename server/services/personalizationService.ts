import { Article } from '../providers/types.js';

export interface ScoredArticle extends Article {
  personalizationScore: number;
  explanationTag: string;
  scoreBreakdown: {
    interestMatch: number;
    behavioralMatch: number;
    geographicRelevance: number;
    freshness: number;
    engagement: number;
    trendingScore: number;
  };
}

export class PersonalizationService {
  /**
   * Scores and ranks articles based on explicit user interests and implicit behavioral history.
   */
  public rankArticles(
    articles: Article[],
    explicitInterests: string[] = ['Technology', 'AI & ML', 'Business', 'Science'],
    behavioralInteractionTopics: Record<string, number> = {},
    scope?: 'india' | 'world' | 'all'
  ): ScoredArticle[] {
    const scored = articles.map((article) => {
      const text = `${article.title} ${article.description} ${article.category || ''} ${article.source?.name || ''}`.toLowerCase();

      // 1. Explicit Interest Match (0 - 100)
      let interestMatch = 0;
      let matchedInterest = '';
      explicitInterests.forEach((interest) => {
        const iLower = interest.toLowerCase();
        if (text.includes(iLower) || article.category?.toLowerCase() === iLower) {
          interestMatch = Math.max(interestMatch, 95);
          if (!matchedInterest) matchedInterest = interest;
        }
      });

      // 2. Behavioral Topic Match (0 - 100) with interaction weights
      let behavioralMatch = 0;
      let matchedBehaviorTopic = '';
      Object.entries(behavioralInteractionTopics).forEach(([topic, count]) => {
        if (text.includes(topic.toLowerCase())) {
          const matchValue = Math.min(100, count * 20);
          if (matchValue > behavioralMatch) {
            behavioralMatch = matchValue;
            matchedBehaviorTopic = topic;
          }
        }
      });

      // 3. Geographic Relevance (0 - 100)
      let geographicRelevance = 35; // Default international base
      const indiaKeywords = [
        'india', 'indian', 'delhi', 'mumbai', 'bengaluru', 'bangalore', 'isro', 'rbi', 'upi',
        'ondc', 'pib', 'pune', 'hyderabad', 'chennai', 'gujarat', 'assam', 'maharashtra'
      ];
      const isIndiaArticle = article.region === 'India' || article.region === 'Indian State' || indiaKeywords.some((k) => text.includes(k));

      if (isIndiaArticle) {
        geographicRelevance = 100;
      } else if (article.region === 'South Asia') {
        geographicRelevance = 75;
      } else if (article.region === 'Global') {
        geographicRelevance = 60;
      }

      // 4. Freshness (0 - 100)
      const ageHours = Math.max(0, (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 3600));
      const freshness = Math.max(0, Math.min(100, 100 - ageHours * 3.5));

      // 5. Engagement (0 - 100)
      const readTime = article.readTimeMinutes || 3;
      const engagement = Math.min(100, Math.max(40, readTime * 15));

      // 6. Global Trending Score (0 - 100)
      const trendingScore = article.trendingScore || 50;

      // Weighted Score
      const finalScore = Math.round(
        0.30 * interestMatch +
        0.20 * behavioralMatch +
        0.20 * geographicRelevance +
        0.15 * freshness +
        0.10 * engagement +
        0.05 * trendingScore
      );

      // Generate Transparent Explanation Tag
      let tag = 'Recommended story';
      if (matchedBehaviorTopic && behavioralMatch > 50) {
        tag = `Recommended because you frequently read ${matchedBehaviorTopic}`;
      } else if (matchedInterest && isIndiaArticle) {
        tag = `Matched to your ${matchedInterest} preference • India Priority`;
      } else if (matchedInterest) {
        tag = `Matched to your ${matchedInterest} preference`;
      } else if (isIndiaArticle) {
        tag = 'India Headlines & Regional Relevance';
      } else if (freshness > 85) {
        tag = 'Fresh Breaking Coverage';
      }

      return {
        ...article,
        personalizationScore: finalScore,
        explanationTag: tag,
        scoreBreakdown: {
          interestMatch,
          behavioralMatch,
          geographicRelevance,
          freshness: Math.round(freshness),
          engagement,
          trendingScore,
        },
      };
    });

    // Apply scope filter
    let filtered = scored;
    if (scope === 'india') {
      const indiaKeywords = ['india', 'indian', 'delhi', 'mumbai', 'bengaluru', 'isro', 'rbi', 'upi', 'pib'];
      filtered = scored.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        return a.region === 'India' || a.region === 'Indian State' || indiaKeywords.some((k) => text.includes(k));
      });
      if (filtered.length === 0) filtered = scored;
    } else if (scope === 'world') {
      filtered = scored.filter((a) => a.region !== 'India' && a.region !== 'Indian State');
      if (filtered.length === 0) filtered = scored;
    }

    filtered.sort((a, b) => b.personalizationScore - a.personalizationScore);
    return filtered;
  }
}

export const personalizationService = new PersonalizationService();

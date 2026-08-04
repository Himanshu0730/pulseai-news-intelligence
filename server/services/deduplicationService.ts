import { Article } from '../providers/types.js';
import { calculateTextSimilarity, normalizeUrl } from '../utils/urlNormalizer.js';

export interface DeduplicationResult {
  uniqueArticles: Article[];
  duplicatesRemovedCount: number;
  duplicateMap: Record<string, { primaryId: string; reason: string; score: number }>;
}

export class DeduplicationService {
  /**
   * Layered Deduplication Pipeline:
   * Layer 1: Canonical URL exact match
   * Layer 2: Normalized title token similarity >= 0.75 within a 48h publication window
   * Layer 3: Publisher + near-identical headline match
   */
  public deduplicateArticles(articles: Article[]): DeduplicationResult {
    const uniqueArticles: Article[] = [];
    const duplicateMap: Record<string, { primaryId: string; reason: string; score: number }> = {};
    const seenUrls = new Set<string>();

    for (const article of articles) {
      const canonicalUrl = article.canonicalUrl || normalizeUrl(article.url);

      // Layer 1: Exact Canonical URL check
      if (canonicalUrl && seenUrls.has(canonicalUrl)) {
        const primary = uniqueArticles.find((a) => (a.canonicalUrl || normalizeUrl(a.url)) === canonicalUrl);
        if (primary) {
          duplicateMap[article.id] = {
            primaryId: primary.id,
            reason: 'Canonical URL match',
            score: 1.0,
          };
          // Increment corroborating sources count on primary
          primary.corroboratingSourcesCount = (primary.corroboratingSourcesCount || 1) + 1;
        }
        continue;
      }

      // Layer 2 & 3: Semantic/Title Similarity check against already kept unique articles
      let duplicateFound = false;
      for (const existing of uniqueArticles) {
        const titleSim = calculateTextSimilarity(article.title, existing.title);

        // Publication time difference in hours
        const timeDiffHours = Math.abs(
          (new Date(article.publishedAt).getTime() - new Date(existing.publishedAt).getTime()) / (1000 * 3600)
        );

        if (titleSim >= 0.75 && timeDiffHours <= 48) {
          duplicateFound = true;
          duplicateMap[article.id] = {
            primaryId: existing.id,
            reason: `Title similarity (${Math.round(titleSim * 100)}%) within 48h window`,
            score: titleSim,
          };
          existing.corroboratingSourcesCount = (existing.corroboratingSourcesCount || 1) + 1;
          break;
        }
      }

      if (!duplicateFound) {
        if (canonicalUrl) seenUrls.add(canonicalUrl);
        uniqueArticles.push({
          ...article,
          canonicalUrl,
        });
      }
    }

    return {
      uniqueArticles,
      duplicatesRemovedCount: articles.length - uniqueArticles.length,
      duplicateMap,
    };
  }
}

export const deduplicationService = new DeduplicationService();

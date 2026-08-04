import { Article, StoryCluster } from '../providers/types.js';
import { calculateTextSimilarity } from '../utils/urlNormalizer.js';

export class ClusteringService {
  /**
   * Performs incremental threshold-based story clustering across input articles.
   * Group articles covering substantially the same real-world story into a StoryCluster.
   */
  public clusterArticles(articles: Article[]): {
    clusters: StoryCluster[];
    unclusteredArticles: Article[];
  } {
    const clusterMap = new Map<string, Article[]>();
    const clusterMeta = new Map<
      string,
      {
        canonicalTopic: string;
        firstSeen: string;
        latestUpdate: string;
        region: string;
      }
    >();

    // 1. First assign articles that already carry explicit storyClusterId
    const remainingArticles: Article[] = [];

    articles.forEach((art) => {
      if (art.storyClusterId) {
        if (!clusterMap.has(art.storyClusterId)) {
          clusterMap.set(art.storyClusterId, []);
          clusterMeta.set(art.storyClusterId, {
            canonicalTopic: art.category || 'Breaking News',
            firstSeen: art.publishedAt,
            latestUpdate: art.publishedAt,
            region: art.region || 'India',
          });
        }
        clusterMap.get(art.storyClusterId)!.push(art);
      } else {
        remainingArticles.push(art);
      }
    });

    // 2. Incrementally group remaining articles based on similarity
    for (const article of remainingArticles) {
      let matchedClusterId: string | null = null;
      let highestSimilarity = 0;

      for (const [clusterId, clusterArticles] of clusterMap.entries()) {
        const representative = clusterArticles[0];
        const titleSim = calculateTextSimilarity(article.title, representative.title);
        const descSim = calculateTextSimilarity(article.description, representative.description);

        const categoryMatch = article.category?.toLowerCase() === representative.category?.toLowerCase() ? 0.1 : 0;
        const totalSim = titleSim * 0.6 + descSim * 0.3 + categoryMatch;

        if (totalSim >= 0.35 && totalSim > highestSimilarity) {
          highestSimilarity = totalSim;
          matchedClusterId = clusterId;
        }
      }

      if (matchedClusterId) {
        clusterMap.get(matchedClusterId)!.push(article);
        const meta = clusterMeta.get(matchedClusterId)!;
        if (new Date(article.publishedAt) > new Date(meta.latestUpdate)) {
          meta.latestUpdate = article.publishedAt;
        }
        if (new Date(article.publishedAt) < new Date(meta.firstSeen)) {
          meta.firstSeen = article.publishedAt;
        }
      } else {
        // Create new cluster if article has substantial description/body
        const newClusterId = `cluster_${article.id}`;
        clusterMap.set(newClusterId, [article]);
        clusterMeta.set(newClusterId, {
          canonicalTopic: article.category || 'General',
          firstSeen: article.publishedAt,
          latestUpdate: article.publishedAt,
          region: article.region || 'India',
        });
      }
    }

    // 3. Build structured StoryCluster objects
    const clusters: StoryCluster[] = [];
    const unclusteredArticles: Article[] = [];

    for (const [clusterId, clusterArticles] of clusterMap.entries()) {
      if (clusterArticles.length <= 1) {
        unclusteredArticles.push(...clusterArticles);
        continue;
      }

      // Sort by publication date ascending to find earliest & primary
      clusterArticles.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

      const representative = clusterArticles.find((a) => a.source?.isPrimary) || clusterArticles[0];
      const meta = clusterMeta.get(clusterId)!;

      // Extract unique publishers
      const publishers = new Set(clusterArticles.map((a) => a.source.name));

      clusters.push({
        clusterId,
        canonicalTopic: representative.category || meta.canonicalTopic,
        clusterTitle: representative.title,
        representativeArticle: representative,
        articles: clusterArticles,
        sourcesCount: clusterArticles.length,
        distinctPublisherCount: publishers.size,
        firstSeen: meta.firstSeen,
        latestUpdate: meta.latestUpdate,
        region: representative.region || meta.region,
        confidenceLevel: representative.confidenceLevel || 'High confidence',
        trendScore: Math.min(100, clusterArticles.length * 20 + publishers.size * 15),
      });
    }

    // Sort clusters by trendScore / size descending
    clusters.sort((a, b) => b.trendScore - a.trendScore);

    return {
      clusters,
      unclusteredArticles,
    };
  }
}

export const clusteringService = new ClusteringService();

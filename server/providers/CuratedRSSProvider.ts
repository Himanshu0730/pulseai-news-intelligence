import Parser from 'rss-parser';
import { generateDeterministicArticleId, normalizeUrl } from '../utils/urlNormalizer.js';
import { Article, NewsFetchOptions, NewsProvider, SourceType } from './types.js';

interface CategoryFeedConfig {
  url: string;
  sourceName: string;
  category: string;
  sourceType: SourceType;
  credibilityScore: number;
  region: 'India' | 'Indian State' | 'South Asia' | 'Global' | 'International';
  /** Optional per-feed timeout override (ms). Defaults to the parser timeout (3000ms). */
  timeoutMs?: number;
}

/**
 * Curated RSS Feeds categorized by topic and region
 */
const RSS_FEEDS_BY_CATEGORY: Record<string, CategoryFeedConfig[]> = {
  Technology: [
    { url: 'https://techcrunch.com/feed/', sourceName: 'TechCrunch', category: 'Technology', sourceType: 'INDEPENDENT', credibilityScore: 92, region: 'Global' },
    { url: 'https://feeds.arstechnica.com/arstechnica/index', sourceName: 'Ars Technica', category: 'Technology', sourceType: 'ESTABLISHED', credibilityScore: 94, region: 'Global' },
    { url: 'https://www.technologyreview.com/feed/', sourceName: 'MIT Tech Review', category: 'Technology', sourceType: 'ESTABLISHED', credibilityScore: 96, region: 'Global' },
    { url: 'https://indianexpress.com/section/technology/feed/', sourceName: 'Indian Express Tech', category: 'Technology', sourceType: 'ESTABLISHED', credibilityScore: 91, region: 'India' },
  ],
  'AI & ML': [
    { url: 'https://venturebeat.com/category/ai/feed/', sourceName: 'VentureBeat AI', category: 'AI & ML', sourceType: 'INDEPENDENT', credibilityScore: 90, region: 'Global' },
    { url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', sourceName: 'MIT Tech Review AI', category: 'AI & ML', sourceType: 'ESTABLISHED', credibilityScore: 96, region: 'Global' },
    { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', sourceName: 'TechCrunch AI', category: 'AI & ML', sourceType: 'INDEPENDENT', credibilityScore: 92, region: 'Global' },
  ],
  Business: [
    { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', sourceName: 'Economic Times', category: 'Business', sourceType: 'ESTABLISHED', credibilityScore: 93, region: 'India' },
    { url: 'https://www.business-standard.com/rss/home_page_top_stories.rss', sourceName: 'Business Standard', category: 'Business', sourceType: 'ESTABLISHED', credibilityScore: 92, region: 'India' },
    { url: 'https://www.thehindubusinessline.com/feed/', sourceName: 'The Hindu BusinessLine', category: 'Business', sourceType: 'ESTABLISHED', credibilityScore: 93, region: 'India' },
  ],
  Sports: [
    { url: 'https://www.espn.com/espn/rss/news', sourceName: 'ESPN', category: 'Sports', sourceType: 'ESTABLISHED', credibilityScore: 92, region: 'Global' },
    { url: 'https://feeds.bbci.co.uk/sport/rss.xml', sourceName: 'BBC Sport', category: 'Sports', sourceType: 'ESTABLISHED', credibilityScore: 95, region: 'Global' },
    { url: 'https://feeds.feedburner.com/ndtvsports-latest', sourceName: 'NDTV Sports', category: 'Sports', sourceType: 'ESTABLISHED', credibilityScore: 89, region: 'India' },
    { url: 'https://indianexpress.com/section/sports/feed/', sourceName: 'Indian Express Sports', category: 'Sports', sourceType: 'ESTABLISHED', credibilityScore: 90, region: 'India' },
  ],
  Science: [
    { url: 'https://www.nature.com/nature.rss', sourceName: 'Nature Journal', category: 'Science', sourceType: 'ESTABLISHED', credibilityScore: 98, region: 'Global' },
    { url: 'https://www.sciencedaily.com/rss/all.xml', sourceName: 'Science Daily', category: 'Science', sourceType: 'ESTABLISHED', credibilityScore: 92, region: 'Global' },
    { url: 'https://www.space.com/feeds/all', sourceName: 'Space.com', category: 'Science', sourceType: 'ESTABLISHED', credibilityScore: 91, region: 'Global' },
  ],
  Health: [
    { url: 'https://medicalxpress.com/rss-feed/', sourceName: 'Medical Xpress', category: 'Health', sourceType: 'INDEPENDENT', credibilityScore: 91, region: 'Global' },
    { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', sourceName: 'BBC Health', category: 'Health', sourceType: 'ESTABLISHED', credibilityScore: 95, region: 'Global' },
  ],
  Politics: [
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', sourceName: 'BBC Politics', category: 'Politics', sourceType: 'ESTABLISHED', credibilityScore: 95, region: 'Global' },
    { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1', sourceName: 'Press Information Bureau (PIB)', category: 'Politics', sourceType: 'PRIMARY', credibilityScore: 98, region: 'India', timeoutMs: 3000 },
    { url: 'https://www.thehindu.com/news/national/feeder/default.rss', sourceName: 'The Hindu National', category: 'Politics', sourceType: 'ESTABLISHED', credibilityScore: 94, region: 'India' },
  ],
  India: [
    { url: 'https://www.thehindu.com/news/national/feeder/default.rss', sourceName: 'The Hindu', category: 'India', sourceType: 'ESTABLISHED', credibilityScore: 94, region: 'India' },
    { url: 'https://indianexpress.com/section/india/feed/', sourceName: 'Indian Express', category: 'India', sourceType: 'ESTABLISHED', credibilityScore: 92, region: 'India' },
    { url: 'https://feeds.feedburner.com/ndtvnews-india-news', sourceName: 'NDTV India', category: 'India', sourceType: 'ESTABLISHED', credibilityScore: 89, region: 'India' },
  ],
  World: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC World News', category: 'World', sourceType: 'ESTABLISHED', credibilityScore: 95, region: 'Global' },
    { url: 'https://www.theguardian.com/world/rss', sourceName: 'The Guardian World', category: 'World', sourceType: 'ESTABLISHED', credibilityScore: 92, region: 'Global' },
  ],
  'World News': [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC World News', category: 'World News', sourceType: 'ESTABLISHED', credibilityScore: 95, region: 'Global' },
    { url: 'https://www.theguardian.com/world/rss', sourceName: 'The Guardian World', category: 'World News', sourceType: 'ESTABLISHED', credibilityScore: 92, region: 'Global' },
  ],
  Entertainment: [
    { url: 'https://variety.com/feed/', sourceName: 'Variety', category: 'Entertainment', sourceType: 'ESTABLISHED', credibilityScore: 91, region: 'Global' },
    { url: 'https://indianexpress.com/section/entertainment/feed/', sourceName: 'Indian Express Entertainment', category: 'Entertainment', sourceType: 'ESTABLISHED', credibilityScore: 90, region: 'India' },
  ],
  'Climate & Energy': [
    { url: 'https://www.carbonbrief.org/feed/', sourceName: 'Carbon Brief', category: 'Climate & Energy', sourceType: 'INDEPENDENT', credibilityScore: 93, region: 'Global' },
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', sourceName: 'BBC Science & Environment', category: 'Climate & Energy', sourceType: 'ESTABLISHED', credibilityScore: 94, region: 'Global' },
    { url: 'https://www.theguardian.com/environment/climate-crisis/rss', sourceName: 'The Guardian Climate', category: 'Climate & Energy', sourceType: 'ESTABLISHED', credibilityScore: 93, region: 'Global' },
  ],
};

export class CuratedRSSProvider implements NewsProvider {
  name = 'CuratedLiveRSS';
  private parser: Parser;
  private slowParser: Parser;

  constructor() {
    const parserOptions = {
      timeout: 3000, // 3-second timeout per feed by default
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['enclosure', 'enclosure'],
          ['content:encoded', 'contentEncoded'],
        ],
      },
    };
    this.parser = new Parser(parserOptions);
    // Dedicated parser for feeds (e.g. PIB) that are slower to respond.
    this.slowParser = new Parser({ ...parserOptions, timeout: 3000 });
  }

  public isAvailable(): boolean {
    return true;
  }

  /**
   * Utility to extract image URL from feed item
   */
  private extractImageUrl(item: any): string {
    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
      return item.mediaContent.$.url;
    }
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
      return item.mediaThumbnail.$.url;
    }
    if (item.enclosure && item.enclosure.url) {
      return item.enclosure.url;
    }
    // Fallback: extract img tag src from description or content
    const html = item.content || item.description || '';
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
  }

  /**
   * Clean HTML tags and sanitize summary text
   */
  private cleanText(text?: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Fetch live feed items for a single feed configuration
   */
  private async fetchSingleFeed(feedConfig: CategoryFeedConfig): Promise<Article[]> {
    try {
      const parser = feedConfig.timeoutMs ? this.slowParser : this.parser;
      const feed = await parser.parseURL(feedConfig.url);
      const articles: Article[] = [];

      for (const item of feed.items || []) {
        if (!item.title || !item.link) continue;

        const canonical = normalizeUrl(item.link);
        const title = this.cleanText(item.title);
        // Guard against items whose body is only media (e.g. an <img> without text):
        // the raw snippet is truthy but cleans to an empty string.
        let description = this.cleanText(item.contentSnippet || item.summary || item.content || title);
        if (!description) description = title;
        // Prefer the full content:encoded payload when the publisher provides it.
        const fullContent = this.cleanText(item.contentEncoded || item.content || description);
        const articleId = generateDeterministicArticleId(canonical, title);
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

        articles.push({
          id: articleId,
          title,
          description: description.substring(0, 300),
          content: fullContent.substring(0, 4000),
          url: item.link,
          canonicalUrl: canonical,
          urlToImage: this.extractImageUrl(item),
          publishedAt: pubDate,
          source: {
            name: feedConfig.sourceName,
            type: feedConfig.sourceType,
            isPrimary: feedConfig.sourceType === 'PRIMARY',
            credibilityScore: feedConfig.credibilityScore,
          },
          category: feedConfig.category,
          author: item.creator || item.author || feedConfig.sourceName,
          readTimeMinutes: Math.max(2, Math.ceil(description.split(' ').length / 50)),
          trendingScore: 85,
          region: feedConfig.region,
          sourceType: feedConfig.sourceType,
          credibilityScore: feedConfig.credibilityScore,
          confidenceLevel: 'High confidence',
          corroboratingSourcesCount: 1,
        });
      }

      return articles;
    } catch (err) {
      console.warn(`[CuratedRSSProvider] Failed to fetch feed ${feedConfig.url}:`, (err as Error).message);
      return [];
    }
  }

  /**
   * Fetch headlines from live RSS sources with strict category isolation
   */
  async fetchHeadlines(options: NewsFetchOptions = {}): Promise<Article[]> {
    const category = options.category;
    let targetFeeds: CategoryFeedConfig[] = [];

    if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'general') {
      const matchedCategoryKey = Object.keys(RSS_FEEDS_BY_CATEGORY).find(
        (key) => key.toLowerCase() === category.toLowerCase()
      );

      if (matchedCategoryKey) {
        targetFeeds = RSS_FEEDS_BY_CATEGORY[matchedCategoryKey];
      } else {
        // Find feeds where category matches partially
        targetFeeds = Object.values(RSS_FEEDS_BY_CATEGORY)
          .flat()
          .filter((f) => f.category.toLowerCase().includes(category.toLowerCase()));
      }
    } else {
      // Pick top 2 feeds from every category for a rich general headline feed
      targetFeeds = Object.values(RSS_FEEDS_BY_CATEGORY).flatMap((feeds) => feeds.slice(0, 2));
    }

    // Fetch all targeted feeds in parallel
    const feedResults = await Promise.all(targetFeeds.map((feed) => this.fetchSingleFeed(feed)));
    const fetchedArticles = feedResults.flat();

    // Return live articles only. If every network request failed we return an empty
    // array rather than fabricating offline placeholder news.
    if (fetchedArticles.length > 0) {
      return fetchedArticles;
    }

    return [];
  }

  /**
   * Search across live RSS feeds or return query matches
   */
  async searchNews(query: string, options: NewsFetchOptions = {}): Promise<Article[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.fetchHeadlines(options);

    // Fetch broad set of feeds to search through
    const allFeeds = Object.values(RSS_FEEDS_BY_CATEGORY).flatMap((feeds) => feeds.slice(0, 2));
    const feedResults = await Promise.all(allFeeds.map((f) => this.fetchSingleFeed(f)));
    const articles = feedResults.flat();

    const filtered = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.source.name.toLowerCase().includes(q)
    );

    // Return only genuine live matches. Do NOT fabricate a placeholder search result.
    return filtered;
  }
}

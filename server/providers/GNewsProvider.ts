import { generateDeterministicArticleId, normalizeUrl } from '../utils/urlNormalizer.js';
import { Article, NewsFetchOptions, NewsProvider } from './types.js';

// Map PulseAI's app categories to GNews-supported categories so category queries
// never fail with an unsupported category value.
const GNEWS_CATEGORY_MAP: Record<string, string> = {
  'ai & ml': 'technology',
  'world news': 'world',
  'climate & energy': 'science',
  technology: 'technology',
  science: 'science',
  health: 'health',
  business: 'business',
  entertainment: 'entertainment',
  sports: 'sports',
};

function resolveGNewsCategory(category?: string): string {
  if (!category || category.toLowerCase() === 'all' || category.toLowerCase() === 'general') {
    return 'general';
  }
  const lower = category.toLowerCase();
  return GNEWS_CATEGORY_MAP[lower] || lower;
}

export class GNewsProvider implements NewsProvider {
  name = 'GNews';
  private apiKey: string;
  private rateLimitUntil: number = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey) && Date.now() >= this.rateLimitUntil;
  }

  private checkCooldown() {
    if (this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      throw new Error(`GNews provider on rate-limit cooldown until ${new Date(this.rateLimitUntil).toLocaleTimeString()}`);
    }
  }

  async fetchHeadlines(options: NewsFetchOptions = {}): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('GNews API key not configured');
    }
    this.checkCooldown();

    const category = resolveGNewsCategory(options.category);
    const limit = options.limit || 15;
    const country = options.country || 'in';
    // 'global' means no single country: omit the country param so GNews returns
    // genuinely international coverage instead of one country's headlines.
    const countryParam = country === 'global' ? '' : `&country=${country}`;
    const url = `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en${countryParam}&max=${limit}&apikey=${this.apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429 || response.status === 403) {
        this.rateLimitUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
      } else if (response.status === 401) {
        console.warn(`[GNews] Invalid API key (401) — pausing provider for 60 minutes`);
        this.rateLimitUntil = Date.now() + 60 * 60 * 1000;
      }
      throw new Error(`GNews error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.articles)) {
      throw new Error(`GNews invalid response structure`);
    }

    return this.normalizeArticles(data.articles, options.category || 'General');
  }

  async searchNews(query: string, options: NewsFetchOptions = {}): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('GNews API key not configured');
    }
    this.checkCooldown();

    const limit = options.limit || 15;
    const country = options.country || 'in';
    // 'global' means no single country: omit the country param so GNews search
    // returns genuinely international coverage instead of one country's articles.
    const countryParam = country === 'global' ? '' : `&country=${country}`;
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en${countryParam}&max=${limit}&apikey=${this.apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429 || response.status === 403) {
        this.rateLimitUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
      } else if (response.status === 401) {
        console.warn(`[GNews] Invalid API key (401) — pausing provider for 60 minutes`);
        this.rateLimitUntil = Date.now() + 60 * 60 * 1000;
      }
      throw new Error(`GNews Search error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.articles)) {
      throw new Error(`GNews invalid search response`);
    }

    return this.normalizeArticles(data.articles, 'Search');
  }

  private normalizeArticles(rawArticles: any[], defaultCategory: string): Article[] {
    return rawArticles
      .filter((a) => a.title && a.url)
      .map((a) => {
        const canonical = normalizeUrl(a.url);
        const articleId = generateDeterministicArticleId(canonical, a.title);

        return {
          id: articleId,
          title: a.title,
          description: a.description || 'No description available.',
          content: a.content || a.description || 'Visit article source for complete details.',
          url: a.url,
          canonicalUrl: canonical,
          urlToImage: a.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
          publishedAt: a.publishedAt || new Date().toISOString(),
          source: {
            name: a.source?.name || 'GNews Publisher',
            type: 'ESTABLISHED',
            credibilityScore: 90,
          },
          category: defaultCategory,
          author: a.source?.name || 'News Desk',
          readTimeMinutes: Math.max(2, Math.round((a.content || a.description || '').length / 300) || 3),
          trendingScore: 80,
          sourceType: 'ESTABLISHED',
          credibilityScore: 90,
          confidenceLevel: 'High confidence',
          corroboratingSourcesCount: 3,
        };
      });
  }
}

import { generateDeterministicArticleId, normalizeUrl } from '../utils/urlNormalizer.js';
import { Article, NewsFetchOptions, NewsProvider } from './types.js';

// Map PulseAI's app categories to NewsAPI-supported categories so category queries
// never fail with an unsupported category value.
const NEWSAPI_CATEGORY_MAP: Record<string, string> = {
  'ai & ml': 'technology',
  'world news': 'general',
  'climate & energy': 'science',
  technology: 'technology',
  science: 'science',
  health: 'health',
  business: 'business',
  entertainment: 'entertainment',
  sports: 'sports',
};

function resolveNewsApiCategory(category?: string): string {
  if (!category || category.toLowerCase() === 'all' || category.toLowerCase() === 'general') {
    return 'general';
  }
  const lower = category.toLowerCase();
  return NEWSAPI_CATEGORY_MAP[lower] || lower;
}

export class NewsAPIProvider implements NewsProvider {
  name = 'NewsAPI';
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
      throw new Error(`NewsAPI provider on rate-limit cooldown until ${new Date(this.rateLimitUntil).toLocaleTimeString()}`);
    }
  }

  async fetchHeadlines(options: NewsFetchOptions = {}): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('NewsAPI key not configured');
    }
    this.checkCooldown();

    const category = resolveNewsApiCategory(options.category);
    const country = options.country || 'in';
    const pageSize = options.limit || 20;

    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${this.apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429 || response.status === 403) {
        this.rateLimitUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
      } else if (response.status === 401) {
        // Invalid/expired API key: back off so we stop hammering an unusable key.
        console.warn(`[NewsAPI] Invalid API key (401) — pausing provider for 60 minutes`);
        this.rateLimitUntil = Date.now() + 60 * 60 * 1000;
      }
      throw new Error(`NewsAPI error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      throw new Error(`NewsAPI invalid response structure`);
    }

    return this.normalizeArticles(data.articles, options.category || 'General');
  }

  async searchNews(query: string, options: NewsFetchOptions = {}): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('NewsAPI key not configured');
    }
    this.checkCooldown();

    const pageSize = options.limit || 20;
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${this.apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429 || response.status === 403) {
        this.rateLimitUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
      } else if (response.status === 401) {
        console.warn(`[NewsAPI] Invalid API key (401) — pausing provider for 60 minutes`);
        this.rateLimitUntil = Date.now() + 60 * 60 * 1000;
      }
      throw new Error(`NewsAPI Search error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      throw new Error(`NewsAPI invalid search response`);
    }

    return this.normalizeArticles(data.articles, 'Search');
  }

  private normalizeArticles(rawArticles: any[], defaultCategory: string): Article[] {
    return rawArticles
      .filter((a) => a.title && a.title !== '[Removed]' && a.url)
      .map((a) => {
        const canonical = normalizeUrl(a.url);
        const articleId = generateDeterministicArticleId(canonical, a.title);
        // NewsAPI appends a truncation marker like " [+1234 chars]"; strip it.
        const rawContent = (a.content || '').replace(/\s*\[\+\d+\s?chars\]\s*$/i, '').trim();
        const textLen = (rawContent || a.description || '').length;
        const readTime = Math.max(2, Math.round(textLen / 300) || 3);

        return {
          id: articleId,
          title: a.title,
          description: a.description || 'No description provided for this story.',
          content: rawContent || a.description || 'Full article content available at source.',
          url: a.url,
          canonicalUrl: canonical,
          urlToImage: a.urlToImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
          publishedAt: a.publishedAt || new Date().toISOString(),
          source: {
            id: a.source?.id || undefined,
            name: a.source?.name || 'Global News',
            type: 'ESTABLISHED',
            credibilityScore: 92,
          },
          category: defaultCategory,
          author: a.author || a.source?.name || 'Staff Reporter',
          readTimeMinutes: readTime,
          trendingScore: 82,
          sourceType: 'ESTABLISHED',
          credibilityScore: 92,
          confidenceLevel: 'High confidence',
          corroboratingSourcesCount: 4,
        };
      });
  }
}

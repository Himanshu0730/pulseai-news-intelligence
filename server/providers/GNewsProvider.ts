import { Article, NewsFetchOptions, NewsProvider } from './types.js';

export class GNewsProvider implements NewsProvider {
  name = 'GNews';
  private apiKey: string;
  private rateLimitUntil: number = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private checkCooldown() {
    if (this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      throw new Error(`GNews rate-limited (HTTP 429). Cooldown active until ${new Date(this.rateLimitUntil).toLocaleTimeString()}`);
    }
  }

  async fetchHeadlines(options: NewsFetchOptions = {}): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('GNews API key not configured');
    }
    this.checkCooldown();

    const category = options.category && options.category.toLowerCase() !== 'all' ? options.category.toLowerCase() : 'general';
    const limit = options.limit || 15;
    const country = options.country || 'in';
    const url = `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&country=${country}&max=${limit}&apikey=${this.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429 || response.status === 403) {
        this.rateLimitUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
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
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${this.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429 || response.status === 403) {
        this.rateLimitUntil = Date.now() + 15 * 60 * 1000; // 15 min cooldown
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
      .map((a, idx) => {
        const urlHash = Buffer.from(a.url).toString('base64').substring(0, 24);
        return {
          id: `gnews_${urlHash}_${idx}`,
          title: a.title,
          description: a.description || 'No description available.',
          content: a.content || a.description || 'Visit article source for complete details.',
          url: a.url,
          urlToImage: a.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
          publishedAt: a.publishedAt || new Date().toISOString(),
          source: {
            name: a.source?.name || 'GNews Publisher',
          },
          category: defaultCategory,
          author: a.source?.name || 'News Desk',
          readTimeMinutes: Math.floor(Math.random() * 3) + 3,
          trendingScore: Math.floor(Math.random() * 25) + 75,
        };
      });
  }
}

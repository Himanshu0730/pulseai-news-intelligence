export type SourceType = 'PRIMARY' | 'ESTABLISHED' | 'INDEPENDENT' | 'FACT_CHECK' | 'VIDEO';

export type ConfidenceLevel =
  | 'High confidence'
  | 'Moderate confidence'
  | 'Limited verification'
  | 'Conflicting reports'
  | 'Unverified';

export interface Article {
  id: string; // Unique hash or URL-based identifier
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    id?: string;
    name: string;
    type?: SourceType;
    isPrimary?: boolean;
    isFactCheck?: boolean;
    credibilityScore?: number;
  };
  category: string;
  author?: string;
  readTimeMinutes?: number;
  trendingScore?: number;
  // Source Intelligence & Geographic Relevance
  region?: 'India' | 'Indian State' | 'South Asia' | 'Global' | 'International';
  sourceType?: SourceType;
  credibilityScore?: number;
  confidenceLevel?: ConfidenceLevel;
  corroboratingSourcesCount?: number;
  storyClusterId?: string;
  primarySourceUrl?: string;
  factCheckStatus?: {
    available: boolean;
    publisher?: string;
    claim?: string;
    verdict?: string;
    url?: string;
  };
  disputedInfo?: {
    isDisputed: boolean;
    details?: string;
  };
}

export interface NewsFetchOptions {
  category?: string;
  query?: string;
  limit?: number;
  country?: string;
}

export interface NewsProvider {
  name: string;
  fetchHeadlines(options?: NewsFetchOptions): Promise<Article[]>;
  searchNews(query: string, options?: NewsFetchOptions): Promise<Article[]>;
}

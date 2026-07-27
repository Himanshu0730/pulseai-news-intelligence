export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  interests: string[];
}

export type SourceType = 'PRIMARY' | 'ESTABLISHED' | 'INDEPENDENT' | 'FACT_CHECK' | 'VIDEO';

export type ConfidenceLevel =
  | 'High confidence'
  | 'Moderate confidence'
  | 'Limited verification'
  | 'Conflicting reports'
  | 'Unverified';

export interface Article {
  id: string;
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
  // Source Intelligence & India-first fields
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

export interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  url_to_image: string;
  published_at: string;
  source_name: string;
  category: string;
  saved_at: string;
}

export interface AISummary {
  article_id: string;
  article_url: string;
  tldr: string;
  key_points: string[];
  analysis: {
    sentiment?: string;
    bias?: string;
    reading_time?: string;
    key_entities?: string[];
  };
  created_at?: string;
}

export type Category =
  | 'All'
  | 'Technology'
  | 'AI & ML'
  | 'Business'
  | 'Science'
  | 'World News'
  | 'Health'
  | 'Climate & Energy'
  | 'Entertainment'
  | 'Sports';

export const ALL_CATEGORIES: Category[] = [
  'All',
  'Technology',
  'AI & ML',
  'Business',
  'Science',
  'World News',
  'Health',
  'Climate & Energy',
  'Entertainment',
  'Sports',
];

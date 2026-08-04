export type SourceType = 'PRIMARY' | 'ESTABLISHED' | 'INDEPENDENT' | 'FACT_CHECK' | 'VIDEO';

export type ConfidenceLevel =
  | 'High confidence'
  | 'Moderate confidence'
  | 'Limited verification'
  | 'Conflicting reports'
  | 'Unverified';

export type MisinformationRiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk';

export interface MisinformationAssessment {
  riskLevel: MisinformationRiskLevel;
  confidenceScore: number; // 0.0 to 1.0
  reasons: string[];
  classifierScore?: number; // Raw model probability from Hugging Face model
  corroboratingSourcesCount: number;
  hasPrimarySource: boolean;
  recommendation: string;
}

export interface FactCheckStatus {
  available: boolean;
  publisher?: string;
  claim?: string;
  verdict?: string;
  url?: string;
}

export interface DisputedInfo {
  isDisputed: boolean;
  details?: string;
}

export interface Article {
  id: string; // Deterministic hash based on canonical URL
  title: string;
  description: string;
  content: string;
  url: string;
  canonicalUrl?: string;
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
  factCheckStatus?: FactCheckStatus;
  disputedInfo?: DisputedInfo;
  misinformationRisk?: MisinformationAssessment;
}

export interface StoryCluster {
  clusterId: string;
  canonicalTopic: string;
  clusterTitle: string;
  representativeArticle: Article;
  articles: Article[];
  sourcesCount: number;
  distinctPublisherCount: number;
  firstSeen: string;
  latestUpdate: string;
  region: string;
  confidenceLevel: ConfidenceLevel;
  misinformationRisk?: MisinformationAssessment;
  trendScore: number;
  summaryBriefing?: {
    whatHappened: string;
    whyItMatters: string;
    confirmedFacts: string[];
    uncertainties: string[];
    sourceAgreement: string[];
    sourceDifferences: string[];
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
  isAvailable?(): boolean;
  fetchHeadlines(options?: NewsFetchOptions): Promise<Article[]>;
  searchNews(query: string, options?: NewsFetchOptions): Promise<Article[]>;
}

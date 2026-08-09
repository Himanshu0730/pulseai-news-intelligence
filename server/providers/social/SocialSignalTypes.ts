/**
 * Social Signal Discovery — shared types.
 *
 * Design principle: social content is a *signal*, not news.
 * A SocialSignalPost is raw, low-authority evidence. A SocialSignal is a
 * deduplicated candidate event whose VerificationStatus must always be shown
 * alongside it so "viral" is never presented as "true".
 */

export type SocialPlatform =
  | 'instagram'
  | 'x'
  | 'youtube'
  | 'facebook'
  | 'reddit'
  | 'telegram'
  | 'web';

/**
 * Source quality tiers used for authority estimation.
 *
 *   A: official government / police / court / company statements
 *   B: established professional news organizations
 *   C: verified journalists / specialist publications
 *   D: social media accounts, anonymous accounts, repost/meme aggregators
 *
 * A Tier-D signal can *trigger* an investigation but can never independently
 * upgrade a story to VERIFIED.
 */
export type SourceTier = 'A' | 'B' | 'C' | 'D';

export type VerificationStatus =
  | 'VERIFIED'
  | 'CORROBORATED'
  | 'DEVELOPING'
  | 'SOCIAL_ONLY'
  | 'UNVERIFIED'
  | 'FALSE_MISLEADING';

export interface SocialPostEngagement {
  likes?: number;
  shares?: number;
  views?: number;
  comments?: number;
  reposts?: number;
}

/** A single raw post observed on a social platform. */
export interface SocialSignalPost {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountHandle?: string;
  accountTier: SourceTier;
  url?: string;
  postedAt: string;
  text: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  engagement?: SocialPostEngagement;
  location?: string;
  category?: string;
  language?: string;
}

/**
 * Multi-signal scoring. Kept separate on purpose: virality must never be
 * conflated with truth. A story can be "high virality + low verification".
 */
export interface SocialSignalScores {
  viralityScore: number; // 0..100 — how much the claim is spreading
  sourceReliabilityScore: number; // 0..100 — authority of the best evidence tier
  corroborationScore: number; // 0..100 — support from trusted reporting
  evidenceScore: number; // 0..100 — richness of preserved evidence
  conflictScore: number; // 0..100 — degree of contradiction
  freshnessScore: number; // 0..100 — recency (0 once stale)
}

export interface SocialVerificationSource {
  name: string;
  url?: string;
  type: 'news' | 'official';
  tier?: SourceTier;
  publishedAt?: string;
  contradictory?: boolean;
}

/** A deduplicated candidate event built from one or more social posts. */
export interface SocialSignal {
  id: string;
  claim: string;
  entities: string[];
  location?: string;
  eventType?: string;
  category: string;
  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt: string;
  postCount: number; // deduplicated underlying posts / claims
  rawPostCount: number; // raw collected posts, including reposts
  repostCount: number; // rawPostCount - postCount (collapsed syndication)
  platforms: SocialPlatform[];
  representativePost?: SocialSignalPost;
  evidence: SocialSignalPost[];
  scores: SocialSignalScores;
  verificationStatus: VerificationStatus;
  trustedCorroborations: number;
  independentTrustedPublishers: number;
  officialStatements: SocialVerificationSource[];
  conflictingSources: SocialVerificationSource[];
  verificationSources: SocialVerificationSource[];
  lastVerifiedAt?: string;
  mock?: boolean;
  providerName?: string;
}

export interface SocialSignalFetchOptions {
  limit?: number;
  since?: string;
}

/**
 * Provider abstraction mirroring the existing NewsProvider pattern. Providers
 * are gate-kept by isAvailable(); a provider that cannot be reached legally or
 * technically reports unavailable instead of fabricating data.
 */
export interface SocialSignalProvider {
  name: string;
  platform: SocialPlatform;
  isAvailable(): boolean | Promise<boolean>;
  fetchSignals(options?: SocialSignalFetchOptions): Promise<SocialSignalPost[]>;
}

export class SocialProviderUnavailableError extends Error {
  constructor(providerName: string, reason?: string) {
    super(`Social provider "${providerName}" is unavailable${reason ? `: ${reason}` : ''}`);
    this.name = 'SocialProviderUnavailableError';
  }
}

export class SocialProviderTimeoutError extends Error {
  constructor(providerName: string) {
    super(`Social provider "${providerName}" timed out`);
    this.name = 'SocialProviderTimeoutError';
  }
}

export class SocialProviderRateLimitError extends Error {
  constructor(providerName: string) {
    super(`Social provider "${providerName}" hit an API rate limit`);
    this.name = 'SocialProviderRateLimitError';
  }
}

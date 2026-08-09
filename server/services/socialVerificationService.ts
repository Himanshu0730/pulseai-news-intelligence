import { calculateTextSimilarity, tokenizeForSimilarity } from '../utils/urlNormalizer.js';
import {
  SocialSignalPost,
  SocialVerificationSource,
  SourceTier,
  VerificationStatus,
} from '../providers/social/SocialSignalTypes.js';

/**
 * Social verification: does trusted reporting corroborate or contradict a viral
 * social claim?
 *
 * IMPORTANT: social virality is never treated as truth. A Tier-D post can
 * *trigger* an investigation, but only trusted (A/B/C) reporting — or an
 * official statement — can move a story toward VERIFIED. Contradiction or a
 * fact-check denial downgrades it to FALSE_MISLEADING.
 *
 * Verification is heuristic (pattern-matched, no LLM dependency) so it is fast,
 * deterministic, and testable. The search source is injected so tests never hit
 * the network.
 */

export interface SearchMatch {
  title: string;
  url?: string;
  source: string;
  publishedAt?: string;
  contradictory: boolean;
  official: boolean;
  factCheck: boolean;
  tier: SourceTier;
}

export interface VerifySignalInput {
  claim: string;
  entities: string[];
  location?: string;
  posts: SocialSignalPost[];
  matches: SearchMatch[];
}

export interface SignalVerificationResult {
  verificationStatus: VerificationStatus;
  trustedCorroborations: number;
  independentTrustedPublishers: number;
  factCheckDenials: number;
  officialStatements: SocialVerificationSource[];
  conflictingSources: SocialVerificationSource[];
  verificationSources: SocialVerificationSource[];
  lastVerifiedAt: string;
}

const OFFICIAL_SOURCE_PATTERNS = [
  /government/i,
  /govt/i,
  /police/i,
  /fire brigade/i,
  /fire department/i,
  /disaster management/i,
  /\bpib\b/i,
  /ministry/i,
  /commission/i,
  /railway/i,
  /\bisro\b/i,
  /department/i,
  /secretariat/i,
  /district magistrate/i,
  /municipal/i,
  /corporation/i,
  /airport authority/i,
  /defence/i,
  /army/i,
  /ncc/i,
  /drdo/i,
  /traffic police/i,
  /toll free helpline/i,
  /official/i,
];

const FACT_CHECK_PATTERNS = [
  /factcheck/i,
  /fact[- ]?check/i,
  /boomlive/i,
  /alt ?news/i,
  /checkyourfact/i,
  /snopes/i,
  /leadstories/i,
  /vishvas news/i,
];

const DENIAL_MARKERS = [
  /\bden(y|ies|ied|ial)\b/i,
  /\bno evidence\b/i,
  /\bnot true\b/i,
  /\bfalse\b/i,
  /\bfake\b/i,
  /\bhoax\b/i,
  /\bdebunk(ed|ing)?\b/i,
  /\buntrue\b/i,
  /\bclarif(y|ies|ied)\b/i,
  /\bno truth\b/i,
  /\bdeepfake\b/i,
  /\bfabricat(e|ed|ion)\b/i,
  /\bnot real\b/i,
  /\bno basis\b/i,
  /\brumour(s)?\b/i,
  /\bunfounded\b/i,
];

const TRUSTED_TIERS: SourceTier[] = ['A', 'B', 'C'];

const sourceHost = (url?: string): string => {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** Pick distinctive keywords from a claim to build a search query. */
export function buildSearchQuery(claim: string, entities: string[], location?: string): string {
  const tokens = [...tokenizeForSimilarity(claim)]
    .filter((t) => t.length > 3)
    .sort((a, b) => b.length - a.length)
    .slice(0, 4);
  const parts = [
    ...entities.filter(Boolean).slice(0, 4),
    location ? `in ${location}` : '',
    ...tokens,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

/** Normalize a news-article search hit into a verification match. */
export function articleToSearchMatch(input: {
  title: string;
  url?: string;
  source: string;
  publishedAt?: string;
}): SearchMatch {
  const haystack = `${input.title} ${input.source}`;
  const official = OFFICIAL_SOURCE_PATTERNS.some((p) => p.test(haystack));
  const factCheck = FACT_CHECK_PATTERNS.some((p) => p.test(haystack));
  const contradictory = DENIAL_MARKERS.some((p) => p.test(input.title));

  let tier: SourceTier = 'C';
  if (official) tier = 'A';
  else if (FACT_CHECK_PATTERNS.some((p) => p.test(haystack))) tier = 'B';
  else if (['times of india', 'hindustan times', 'ndtv', 'indian express', 'the hindu', 'moneycontrol', 'cnbc', 'buzzfeed', 'india today', 'reuters', 'bbc', 'guardian'].some((s) => haystack.toLowerCase().includes(s))) {
    tier = 'B';
  }

  return { title: input.title, url: input.url, source: input.source, publishedAt: input.publishedAt, contradictory, official, factCheck, tier };
}

/**
 * Classify a signal from its analyzed search matches. Pure and deterministic so
 * the rule set is unit-testable. Rules are ordered by precedence:
 *
 *   1. any fact-check denial            -> FALSE_MISLEADING
 *   2. an official contradiction        -> FALSE_MISLEADING
 *   3. any contradiction w/ corroboration -> UNVERIFIED
 *   4. official confirm + >=2 trusted   -> VERIFIED
 *   5. >=3 trusted corroborations       -> VERIFIED
 *   6. >=2 trusted corroborations       -> CORROBORATED
 *   7. 1 trusted corroboration          -> DEVELOPING
 *   8. social evidence only             -> SOCIAL_ONLY
 *   9. otherwise                        -> UNVERIFIED
 */
export function classifyVerification(params: {
  trustedCorroborations: number;
  officialStatements: SocialVerificationSource[];
  conflictingSources: SocialVerificationSource[];
  factCheckDenials: number;
  hasSocialEvidence: boolean;
}): VerificationStatus {
  if (params.factCheckDenials >= 1) return 'FALSE_MISLEADING';
  if (params.conflictingSources.some((s) => s.type === 'official')) return 'FALSE_MISLEADING';

  const conflicts = params.conflictingSources.length;
  const trusted = params.trustedCorroborations;
  const officialCount = params.officialStatements.length;

  if (conflicts >= 1 && trusted >= 1) return 'UNVERIFIED';
  if (officialCount >= 1 && trusted >= 2) return 'VERIFIED';
  if (trusted >= 3) return 'VERIFIED';
  if (trusted >= 2) return 'CORROBORATED';
  if (trusted === 1) return 'DEVELOPING';
  if (params.hasSocialEvidence) return 'SOCIAL_ONLY';
  return 'UNVERIFIED';
}

/** Score 0..100 for how well the signal is supported by trusted reporting. */
export function computeCorroborationScore(
  trustedCorroborations: number,
  officialStatements: SocialVerificationSource[]
): number {
  return Math.min(100, trustedCorroborations * 20 + officialStatements.length * 15);
}

/** Score 0..100 for how strongly reporting contradicts the claim. */
export function computeConflictScore(conflictingSources: SocialVerificationSource[]): number {
  return Math.min(100, conflictingSources.length * 33);
}

export function computeSourceReliabilityScore(posts: SocialSignalPost[]): number {
  const tiers: SourceTier[] = posts.map((p) => p.accountTier);
  let score = 0;
  for (const tier of tiers) {
    if (tier === 'A') score = Math.max(score, 100);
    else if (tier === 'B') score = Math.max(score, 85);
    else if (tier === 'C') score = Math.max(score, 65);
    else score = Math.max(score, 35);
  }
  return score;
}

export function computeEvidenceScore(posts: SocialSignalPost[]): number {
  let score = 20;
  if (posts.some((p) => p.mediaUrls && p.mediaUrls.length > 0)) score += 40;
  if (posts.length >= 2) score += 30;
  if (posts.some((p) => p.location)) score += 20;
  return Math.min(100, score);
}

export class SocialVerificationService {
  private searchFn: (query: string, scope?: 'india' | 'world' | 'all') => Promise<{ articles: { title: string; url?: string; source: string; publishedAt?: string }[] }>;

  constructor(opts?: {
    searchFn?: (query: string, scope?: 'india' | 'world' | 'all') => Promise<{ articles: { title: string; url?: string; source: string; publishedAt?: string }[] }>;
  }) {
    this.searchFn = opts?.searchFn ?? (async (query, scope) => {
      const { newsService } = await import('../providers/NewsService.js');
      const res = await newsService.searchNews(query, scope);
      return {
        articles: res.articles.map((a) => ({
          title: a.title,
          url: a.url,
          source: String(a.source || ''),
          publishedAt: a.publishedAt,
        })),
      };
    });
  }

  /**
   * Verify a single deduplicated signal against trusted reporting. Never throws
   * on search failure — a failed search degrades to SOCIAL_ONLY/UNVERIFIED.
   */
  async verifySignal(input: VerifySignalInput): Promise<SignalVerificationResult> {
    const query = buildSearchQuery(input.claim, input.entities, input.location);
    let matches: SearchMatch[] = [];

    try {
      const res = await this.searchFn(query, 'india');
      matches = (res.articles || []).map((a) =>
        articleToSearchMatch({ title: a.title, url: a.url, source: a.source, publishedAt: a.publishedAt })
      );
    } catch (err) {
      console.warn('[SocialVerification] search failed, treating signal as social-only:', (err as Error).message);
    }

    // Keep only matches that are topically related to the claim (defensive:
    // search backends can return off-topic rows).
    const claimTokens = tokenizeForSimilarity(input.claim);
    const related = matches.filter((m) => {
      const sim = calculateTextSimilarity(m.title, input.claim);
      const tokenOverlap = [...claimTokens].filter((t) => m.title.toLowerCase().includes(t)).length;
      return sim >= 0.15 || tokenOverlap >= 2;
    });

    return this.buildResult(input.posts, related);
  }

  private buildResult(posts: SocialSignalPost[], matches: SearchMatch[]): SignalVerificationResult {
    const trusted = matches.filter((m) => !m.contradictory && TRUSTED_TIERS.includes(m.tier));
    const officialStatements = trusted
      .filter((m) => m.official)
      .map((m) => ({ name: m.source, url: m.url, type: 'official' as const, tier: m.tier, publishedAt: m.publishedAt, contradictory: false }));
    const conflicting = matches
      .filter((m) => m.contradictory)
      .map((m) => ({ name: m.source, url: m.url, type: (m.official ? 'official' : 'news') as SocialVerificationSource['type'], tier: m.tier, publishedAt: m.publishedAt, contradictory: true }));
    const factCheckDenials = matches.filter((m) => m.factCheck && m.contradictory).length;

    const verificationSources: SocialVerificationSource[] = [
      ...officialStatements,
      ...conflicting,
      ...trusted.filter((m) => !m.official).map((m) => ({ name: m.source, url: m.url, type: 'news' as const, tier: m.tier, publishedAt: m.publishedAt, contradictory: false })),
    ].slice(0, 8);

    const trustedCorroborations = trusted.length;
    const independentTrustedPublishers = new Set(trusted.map((m) => sourceHost(m.url) || m.source.toLowerCase())).size;

    const verificationStatus = classifyVerification({
      trustedCorroborations,
      officialStatements,
      conflictingSources: conflicting,
      factCheckDenials,
      hasSocialEvidence: posts.length > 0,
    });

    return {
      verificationStatus,
      trustedCorroborations,
      independentTrustedPublishers,
      factCheckDenials,
      officialStatements,
      conflictingSources: conflicting,
      verificationSources,
      lastVerifiedAt: new Date().toISOString(),
    };
  }
}

export const socialVerificationService = new SocialVerificationService();

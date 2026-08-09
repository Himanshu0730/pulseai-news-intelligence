import crypto from 'crypto';
import { db } from '../db/index.js';
import { elapsedMs, logPerf } from '../utils/perf.js';
import { tokenizeForSimilarity } from '../utils/urlNormalizer.js';
import { GeoScope } from './geoScopeService.js';
import { InstagramSignalProvider } from '../providers/social/InstagramSignalProvider.js';
import { MockSocialSignalProvider } from '../providers/social/MockSocialSignalProvider.js';
import {
  SocialPlatform,
  SocialSignal,
  SocialSignalPost,
  SocialSignalProvider,
  SocialSignalScores,
  SocialProviderUnavailableError,
} from '../providers/social/SocialSignalTypes.js';
import {
  computeConflictScore,
  computeCorroborationScore,
  computeEvidenceScore,
  computeSourceReliabilityScore,
  socialVerificationService,
} from './socialVerificationService.js';

/**
 * Social Signal Discovery orchestrator.
 *
 * Pipeline:
 *   1. Collect raw posts from available providers (adapter-style, never scraped,
 *      mock provider gated behind an env flag).
 *   2. Deduplicate reposts into underlying claims (Jaccard similarity).
 *   3. Score virality (engagement + spread + freshness), evidence, corroboration.
 *   4. Verify the top signals against trusted reporting (never auto-verified).
 *   5. Cache under `social_signals_v1_{scope}` with stale-while-revalidate and
 *      single-flight so the main feed endpoint is NEVER blocked by this layer.
 *
 * Every signal carries a VerificationStatus — virality is never presented as
 * truth. A provider that is unavailable (e.g. no authorized Instagram source)
 * simply yields no signals; the pipeline degrades to an empty, healthy response.
 */
export interface SocialSignalsPayload {
  signals: SocialSignal[];
  generatedAt: string;
  providers: string[];
  mock: boolean;
  rawPostsCollected: number;
  stale: boolean;
}

interface RawPostClusters {
  clusters: SocialSignalPost[][];
  rawCount: number;
}

const SIGNAL_TTL_MS = 24 * 60 * 60 * 1000; // signals older than 24h are stale/expired
const SIGNAL_CACHE_SECONDS = 600; // cached response TTL (10 min)
const STALE_WINDOW_MS = 5 * 60 * 1000; // serve stale + background refresh
const REPOST_SIMILARITY = 0.6; // jaccard threshold for collapsing posts into one claim
const REPOST_CONTAINMENT = 0.7; // or one post containing ~70% of a shorter post's tokens (syndicated repost)
const MAX_VERIFY_SIGNALS = 5; // verify only the most viral signals (bounded work)
const VERIFICATION_TIMEOUT_MS = 6000;
const VERIFY_CACHE_SECONDS = 300; // re-verify no more than every 5 min per claim
const PROVIDER_COOLDOWN_MS = 5 * 60 * 1000; // skip a failed provider for 5 min

// India-focused locality hints used to prioritize signals by geographic scope.
// Prioritization is deliberately LENIENT: mismatched signals are demoted, never
// dropped, so a thin data set still surfaces leads (virality is a lead, not truth).
const INDIA_LOCATIONS: string[] = [
  'mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'chennai', 'kolkata',
  'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'lucknow', 'gurugram', 'gurgaon',
  'noida', 'kochi', 'thiruvananthapuram', 'chandigarh', 'indore', 'bhopal',
  'vadodara', 'surat', 'nagpur', 'kanpur', 'kerala', 'gujarat', 'maharashtra',
  'tamil nadu', 'karnataka', 'telangana', 'uttar pradesh', 'rajasthan', 'india',
  'indian', 'bandra', 'juhu', 'dwarka', 'saket', 'kankaria', 'marine drive',
];

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });

/** Deterministic signal id derived from the claim text (stable across refreshes). */
export function hashClaim(claim: string): string {
  const hash = crypto.createHash('sha256').update(claim.trim().toLowerCase()).digest('hex').substring(0, 14);
  return `sig_${hash}`;
}

/** Log-scaled engagement component (0..100) so one mega-post cannot dominate. */
export function computeEngagementScore(posts: SocialSignalPost[]): number {
  let views = 0;
  let likes = 0;
  let shares = 0;
  let comments = 0;
  for (const p of posts) {
    views += p.engagement?.views || 0;
    likes += p.engagement?.likes || 0;
    shares += p.engagement?.shares || (p.engagement?.reposts || 0);
    comments += p.engagement?.comments || 0;
  }
  const logScale = (n: number): number => (n <= 0 ? 0 : Math.min(100, Math.log10(n + 1) * 16.67));
  return Math.round(0.4 * logScale(views) + 0.3 * logScale(likes) + 0.2 * logScale(shares) + 0.1 * logScale(comments));
}

/** Recency component: 100 at 0h, decaying linearly to 0 at the signal TTL. */
export function computeFreshnessScore(postedAt: string, now: number): number {
  const ageMs = Math.max(0, now - new Date(postedAt).getTime());
  if (ageMs >= SIGNAL_TTL_MS) return 0;
  return Math.round(100 * (1 - ageMs / SIGNAL_TTL_MS));
}

/**
 * Virality score 0..100 = 40% engagement + 30% spread + 30% freshness.
 * Always kept separate from verification scores.
 */
export function computeViralityScore(posts: SocialSignalPost[], now: number): number {
  const engagement = computeEngagementScore(posts);
  const spread = Math.min(100, posts.length * 12);
  const freshness = Math.min(...posts.map((p) => computeFreshnessScore(p.postedAt, now)));
  return Math.round(0.4 * engagement + 0.3 * spread + 0.3 * freshness);
}

/** Collapse reposts (same claim, similar wording) into underlying claim groups. */
export function dedupeSocialPosts(posts: SocialSignalPost[], now: number): RawPostClusters {
  const fresh = posts.filter((p) => new Date(p.postedAt).getTime() > now - SIGNAL_TTL_MS);
  const sorted = [...fresh].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  const clusters: SocialSignalPost[][] = [];
  const tokenized = new Map<string, Set<string>>();
  for (const post of sorted) tokenized.set(post.id, tokenizeForSimilarity(post.text));

  for (const post of sorted) {
    let placed = false;
    const postTokens = tokenized.get(post.id)!;
    for (const cluster of clusters) {
      const representative = cluster[0];
      const repTokens = tokenized.get(representative.id)!;
      const sameWindow =
        Math.abs(new Date(post.postedAt).getTime() - new Date(representative.postedAt).getTime()) <= 48 * 60 * 60 * 1000;

      let intersection = 0;
      for (const tok of postTokens) {
        if (repTokens.has(tok)) intersection++;
      }
      const union = postTokens.size + repTokens.size - intersection;
      const jaccard = union === 0 ? 0 : intersection / union;
      // Syndication check: a repost often pads/rewrites the original claim, so
      // the shorter post may be almost fully contained in the longer one even
      // when the plain Jaccard ratio sits below the threshold.
      const minSize = Math.min(postTokens.size, repTokens.size);
      const containment = minSize === 0 ? 0 : intersection / minSize;

      if (sameWindow && (jaccard >= REPOST_SIMILARITY || containment >= REPOST_CONTAINMENT)) {
        cluster.push(post);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([post]);
  }

  return { clusters, rawCount: sorted.length };
}

/** Build the social-scores block for a cluster of posts. */
export function buildScores(posts: SocialSignalPost[], now: number): SocialSignalScores {
  return {
    viralityScore: computeViralityScore(posts, now),
    sourceReliabilityScore: computeSourceReliabilityScore(posts),
    corroborationScore: 0,
    evidenceScore: computeEvidenceScore(posts),
    conflictScore: 0,
    freshnessScore: computeFreshnessScore(posts[0].postedAt, now),
  };
}

export class SocialSignalService {
  private providers: SocialSignalProvider[] = [];
  private pendingFetches = new Map<string, Promise<SocialSignalsPayload>>();
  private refreshing = new Set<string>();
  private lastGood = new Map<string, { data: SocialSignalsPayload; at: number }>();
  private providerCooldowns = new Map<string, number>();
  private verificationService: typeof socialVerificationService;

  constructor(injectedProviders?: SocialSignalProvider[], opts?: { verification?: typeof socialVerificationService }) {
    this.verificationService = opts?.verification ?? socialVerificationService;
    if (injectedProviders && injectedProviders.length > 0) {
      this.providers = injectedProviders;
      return;
    }
    this.providers = [new InstagramSignalProvider()];
    // Mock provider is opt-in for local development only (env-gated).
    if (process.env.SOCIAL_SIGNAL_MOCK_ENABLED === 'true') {
      this.providers.push(new MockSocialSignalProvider());
    }
  }

  private async collectPosts(): Promise<{ posts: SocialSignalPost[]; providers: string[]; mock: boolean }> {
    const posts: SocialSignalPost[] = [];
    const providers: string[] = [];
    let mock = false;
    const now = Date.now();

    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          const available = typeof provider.isAvailable === 'function' ? await provider.isAvailable() : true;
          if (!available) return;

          const cooldownUntil = this.providerCooldowns.get(provider.name) || 0;
          if (cooldownUntil > now) return; // provider is cooling down after a failure

          const results = await withTimeout(provider.fetchSignals({ limit: 50 }), 3000);
          posts.push(...results);
          providers.push(provider.name);
          if (provider.platform === 'web' || results.some((p) => p.id.startsWith('mock_'))) {
            mock = true;
          }
        } catch (err) {
          this.providerCooldowns.set(provider.name, now + PROVIDER_COOLDOWN_MS);
          if (!(err instanceof SocialProviderUnavailableError)) {
            console.warn(`[SocialSignals] Provider ${provider.name} failed:`, (err as Error).message);
          }
        }
      })
    );

    return { posts, providers, mock };
  }

  /** Verify the most viral signals only, best-effort and time-bounded. */
  private async verifySignals(signals: SocialSignal[]): Promise<SocialSignal[]> {
    const top = [...signals].sort((a, b) => b.scores.viralityScore - a.scores.viralityScore).slice(0, MAX_VERIFY_SIGNALS);

    const verified = await Promise.all(
      top.map(async (signal) => {
        const cacheKey = `social_verify_${signal.id}`;
        try {
          const cached = await db.getCachedNews(cacheKey);
          if (cached) {
            return { ...signal, ...cached, verificationSources: cached.verificationSources ?? signal.verificationSources ?? [] };
          }
        } catch {
          /* cache unavailable — verify anyway */
        }
        try {
          const result = await withTimeout(
            this.verificationService.verifySignal({
              claim: signal.claim,
              entities: signal.entities,
              location: signal.location,
              posts: signal.evidence,
              matches: [],
            }),
            VERIFICATION_TIMEOUT_MS
          );
          db.setCachedNews(cacheKey, result, VERIFY_CACHE_SECONDS).catch(() => {});
          return {
            ...signal,
            ...result,
            scores: {
              ...signal.scores,
              corroborationScore: computeCorroborationScore(result.trustedCorroborations, result.officialStatements),
              conflictScore: computeConflictScore(result.conflictingSources),
            },
          };
        } catch (err) {
          console.warn(`[SocialSignals] Verification skipped for "${signal.claim.slice(0, 60)}":`, (err as Error).message);
          return signal; // verification is best-effort; signal remains SOCIAL_ONLY/UNVERIFIED
        }
      })
    );

    const verifiedById = new Map(verified.map((s) => [s.id, s]));
    return signals.map((s) => verifiedById.get(s.id) ?? s);
  }

  private buildSignalsFromPosts(posts: SocialSignalPost[], scope: GeoScope = 'all'): SocialSignal[] {
    const now = Date.now();
    const { clusters, rawCount } = dedupeSocialPosts(posts, now);
    if (clusters.length === 0) return [];

    return clusters
      .map((cluster) => {
        const representative =
          [...cluster].sort(
            (a, b) =>
              (b.engagement?.views || 0) + (b.engagement?.likes || 0) -
              ((a.engagement?.views || 0) + (a.engagement?.likes || 0))
          )[0];
        const claim = representative.text.trim().slice(0, 220);
        const firstSeenAt = [...cluster].map((p) => p.postedAt).sort()[0];
        const lastSeenAt = [...cluster].map((p) => p.postedAt).sort().reverse()[0];

        return {
          id: hashClaim(claim),
          claim,
          entities: extractEntities(representative),
          location: representative.location,
          eventType: representative.category,
          category: representative.category || 'General',
          firstSeenAt,
          lastSeenAt,
          expiresAt: new Date(new Date(lastSeenAt).getTime() + SIGNAL_TTL_MS).toISOString(),
          postCount: cluster.length,
          rawPostCount: rawCount,
          repostCount: cluster.length - 1,
          platforms: [...new Set(cluster.map((p) => p.platform))] as SocialPlatform[],
          representativePost: representative,
          evidence: cluster.slice(0, 8),
          scores: buildScores(cluster, now),
          verificationStatus: 'SOCIAL_ONLY',
          trustedCorroborations: 0,
          independentTrustedPublishers: 0,
          officialStatements: [],
          conflictingSources: [],
          verificationSources: [],
        } satisfies SocialSignal;
      })
      .sort((a, b) => {
        const rankDiff = scopeGeoRank(b, scope) - scopeGeoRank(a, scope);
        if (rankDiff !== 0) return rankDiff;
        return b.scores.viralityScore - a.scores.viralityScore;
      });
  }

  private async buildPayload(scope: GeoScope = 'all'): Promise<SocialSignalsPayload> {
    const { posts, providers, mock } = await this.collectPosts();
    let signals = this.buildSignalsFromPosts(posts, scope);
    signals = await this.verifySignals(signals);
    return {
      signals,
      generatedAt: new Date().toISOString(),
      providers,
      mock,
      rawPostsCollected: posts.length,
      stale: false,
    };
  }

  /**
   * Stale-while-revalidate read with single-flight, mirroring NewsService so the
   * endpoint returns instantly once the cache (or last-good snapshot) exists and
   * never blocks the main feed on social collection.
   */
  async getSocialSignals(scope: GeoScope = 'all', forceRefresh = false): Promise<SocialSignalsPayload> {
    const cacheKey = `social_signals_v1_${scope}`;
    const t0 = Date.now();

    try {
      if (!forceRefresh) {
        const entry = db.peekCachedNews(cacheKey);
        const now = Date.now();
        if (entry) {
          if (now < entry.expires_at) {
            logPerf(`SocialSignals cache hit (fresh) ${cacheKey}`, elapsedMs(t0));
            return entry.data;
          }
          if (now - entry.expires_at < STALE_WINDOW_MS) {
            logPerf(`SocialSignals cache hit (stale) ${cacheKey}`, elapsedMs(t0));
            this.rememberGood(cacheKey, entry.data);
            this.refreshInBackground(cacheKey);
            return { ...entry.data, stale: true };
          }
        }

        const snapshot = this.lastGood.get(cacheKey);
        if (snapshot) {
          logPerf(`SocialSignals cache hit (snapshot) ${cacheKey}`, elapsedMs(t0));
          this.refreshInBackground(cacheKey);
          return { ...snapshot.data, stale: true };
        }
      }

      // Cold start or forced refresh: single-flight the collection so concurrent
      // requests share one fetch.
      const inflight = this.pendingFetches.get(cacheKey);
      if (inflight) return inflight;

      const task = (async () => {
        const payload = await this.buildPayload(scope);
        if (payload.signals.length > 0) {
          this.rememberGood(cacheKey, payload);
          await db.setCachedNews(cacheKey, payload, SIGNAL_CACHE_SECONDS).catch(() => {});
        }
        return payload;
      })();
      this.pendingFetches.set(cacheKey, task);
      try {
        return await task;
      } finally {
        this.pendingFetches.delete(cacheKey);
      }
    } catch (err) {
      console.warn('[SocialSignals] Collection failed:', (err as Error).message);
      return { signals: [], generatedAt: new Date().toISOString(), providers: [], mock: false, rawPostsCollected: 0, stale: false };
    }
  }

  private rememberGood(cacheKey: string, data: SocialSignalsPayload): void {
    this.lastGood.set(cacheKey, { data, at: Date.now() });
  }

  private refreshInBackground(cacheKey: string): void {
    if (this.refreshing.has(cacheKey)) return;
    this.refreshing.add(cacheKey);
    const scope = (cacheKey.split('_').pop() || 'all') as GeoScope;
    const t0 = Date.now();
    this.buildPayload(scope)
      .then(async (payload) => {
        if (payload.signals.length > 0) {
          this.rememberGood(cacheKey, payload);
          await db.setCachedNews(cacheKey, payload, SIGNAL_CACHE_SECONDS).catch(() => {});
        }
        logPerf(`SocialSignals background refresh ${cacheKey}`, elapsedMs(t0));
      })
      .catch((err: Error) => {
        console.warn(`[SocialSignals] Background refresh failed for ${cacheKey}:`, err?.message);
      })
      .finally(() => {
        this.refreshing.delete(cacheKey);
      });
  }
}

/** Is the signal geographically India-focused (location/entities/claim hints)? */
function isIndiaSignal(signal: SocialSignal): boolean {
  const text = `${signal.location || ''} ${signal.claim || ''} ${(signal.entities || []).join(' ')}`.toLowerCase();
  return INDIA_LOCATIONS.some((loc) => text.includes(loc));
}

/**
 * Geographic-scope relevance rank used to order signals:
 *  +1 preferred by the scope, 0 neutral, -1 demoted (India-local under 'world').
 * Never drops signals — only reorders them.
 */
function scopeGeoRank(signal: SocialSignal, scope: GeoScope): number {
  if (scope === 'all') return 0;
  const india = isIndiaSignal(signal);
  if (scope === 'india') return india ? 1 : 0;
  return india ? -1 : 0;
}

/** Extract candidate entities from post text/location (keyword-ish heuristic). */
export function extractEntities(post: SocialSignalPost): string[] {
  const tokens = [...tokenizeForSimilarity(`${post.location || ''} ${post.category || ''} ${post.text}`)]
    .filter((t) => t.length > 3)
    .slice(0, 6);
  const names = new Set<string>();
  if (post.location) names.add(post.location);
  for (const t of tokens) names.add(t.charAt(0).toUpperCase() + t.slice(1));
  return [...names].slice(0, 6);
}

export const socialSignalService = new SocialSignalService();

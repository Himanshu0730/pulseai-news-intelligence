import assert from 'node:assert';
import { test } from 'node:test';
import { InstagramSignalProvider } from '../server/providers/social/InstagramSignalProvider.ts';
import { MockSocialSignalProvider } from '../server/providers/social/MockSocialSignalProvider.ts';
import { SocialProviderUnavailableError } from '../server/providers/social/SocialSignalTypes.ts';
import {
  buildScores,
  computeEngagementScore,
  computeFreshnessScore,
  computeViralityScore,
  dedupeSocialPosts,
  hashClaim,
  SocialSignalService,
} from '../server/services/socialSignalService.ts';
import {
  articleToSearchMatch,
  buildSearchQuery,
  classifyVerification,
  computeConflictScore,
  computeCorroborationScore,
  computeEvidenceScore,
  computeSourceReliabilityScore,
  SocialVerificationService,
} from '../server/services/socialVerificationService.ts';

const now = Date.now();
const minsAgo = (m) => new Date(now - m * 60_000).toISOString();

function post(partial = {}) {
  return {
    id: partial.id ?? `p_${Math.random().toString(36).slice(2)}`,
    platform: partial.platform ?? 'instagram',
    accountName: partial.accountName ?? 'Citizen Reports',
    accountHandle: '@citizenreports',
    accountTier: partial.accountTier ?? 'D',
    url: partial.url,
    postedAt: partial.postedAt ?? minsAgo(20),
    text: partial.text ?? 'Massive fire reported at Bandra-Kurla Complex in Mumbai, evacuation underway.',
    mediaUrls: partial.mediaUrls,
    engagement: partial.engagement ?? { likes: 5000, shares: 1000, views: 120000, comments: 90 },
    location: partial.location ?? 'Mumbai',
    category: partial.category ?? 'Breaking Incidents',
  };
}

const FIRE_CLAIM = 'Massive fire reported at the Bandra-Kurla Complex in Mumbai, evacuation underway';
const FIRE_POSTS = [post({ id: 'fire_1', text: FIRE_CLAIM })];
const VERIFY = (articles) => new SocialVerificationService({ searchFn: async () => ({ articles }) });

class FakeProvider {
  constructor(posts) {
    this.name = 'FakeProvider';
    this.platform = 'instagram';
    this.fetchCount = 0;
    this.posts = posts;
  }
  isAvailable() {
    return true;
  }
  async fetchSignals() {
    this.fetchCount += 1;
    return this.posts;
  }
}

test('1. Instagram provider reports unavailable without an authorized config and never fabricates data', async () => {
  const prevUrl = process.env.INSTAGRAM_SOCIAL_API_URL;
  const prevToken = process.env.INSTAGRAM_SOCIAL_API_TOKEN;
  try {
    delete process.env.INSTAGRAM_SOCIAL_API_URL;
    delete process.env.INSTAGRAM_SOCIAL_API_TOKEN;
    const provider = new InstagramSignalProvider();
    assert.strictEqual(provider.isAvailable(), false, 'must be unavailable by default');
    await assert.rejects(() => provider.fetchSignals(), SocialProviderUnavailableError);
  } finally {
    if (prevUrl === undefined) delete process.env.INSTAGRAM_SOCIAL_API_URL;
    else process.env.INSTAGRAM_SOCIAL_API_URL = prevUrl;
    if (prevToken === undefined) delete process.env.INSTAGRAM_SOCIAL_API_TOKEN;
    else process.env.INSTAGRAM_SOCIAL_API_TOKEN = prevToken;
  }
});

test('2. Mock provider is opt-in behind SOCIAL_SIGNAL_MOCK_ENABLED and flags every post as mock', async () => {
  const prev = process.env.SOCIAL_SIGNAL_MOCK_ENABLED;
  try {
    delete process.env.SOCIAL_SIGNAL_MOCK_ENABLED;
    const disabled = new MockSocialSignalProvider();
    assert.strictEqual(disabled.isAvailable(), false, 'mock provider must be off by default');

    process.env.SOCIAL_SIGNAL_MOCK_ENABLED = 'true';
    const enabled = new MockSocialSignalProvider();
    assert.strictEqual(enabled.isAvailable(), true);
    const posts = await enabled.fetchSignals();
    assert.ok(posts.length > 0, 'mock provider should return fixture posts when enabled');
    assert.ok(posts.every((p) => p.id.startsWith('mock_')), 'every mock post must be clearly flagged');
  } finally {
    if (prev === undefined) delete process.env.SOCIAL_SIGNAL_MOCK_ENABLED;
    else process.env.SOCIAL_SIGNAL_MOCK_ENABLED = prev;
  }
});

test('3. Repost dedup collapses similar posts into one claim and preserves repost counts', () => {
  const similarA = post({ id: 'a', text: 'Massive fire reported at Bandra-Kurla Complex in Mumbai, evacuation underway.' });
  const similarB = post({ id: 'b', text: 'Massive fire reported at Bandra-Kurla Complex in Mumbai, evacuation is underway.' });
  const unrelated = post({ id: 'c', text: 'Severe waterlogging reported on Outer Ring Road in Bengaluru after heavy rain.' });

  const { clusters, rawCount } = dedupeSocialPosts([similarA, similarB, unrelated], now);

  assert.strictEqual(clusters.length, 2, 'two distinct claims expected (fire + waterlogging)');
  assert.strictEqual(rawCount, 3, 'raw posts preserved separately');
  const fireCluster = clusters.find((c) => c[0].id === 'a' || c[0].id === 'b');
  assert.ok(fireCluster && fireCluster.length === 2, 'near-identical fire posts must collapse into one claim');
  assert.strictEqual(hashClaim('x'), hashClaim('X'), 'claim hash must be stable/identity-independent');
});

test('4. Posts older than the 24h signal window are filtered out as stale', () => {
  const fresh = post({ id: 'fresh', postedAt: minsAgo(60) });
  const stale = post({ id: 'stale', postedAt: new Date(now - 30 * 60 * 60 * 1000).toISOString() });

  const { clusters, rawCount } = dedupeSocialPosts([fresh, stale], now);
  assert.strictEqual(rawCount, 1, 'stale post must be excluded');
  assert.strictEqual(clusters.length, 1);
  assert.strictEqual(clusters[0][0].id, 'fresh');
  assert.strictEqual(computeFreshnessScore(stale.postedAt, now), 0, 'stale post freshness must be 0');
  assert.ok(computeFreshnessScore(fresh.postedAt, now) > 0, 'fresh post freshness must be > 0');
});

test('5. Virality scoring ranks engagement, spread and freshness into a bounded 0-100 scale', () => {
  const viral = post({ id: 'viral', engagement: { likes: 1_000_000, shares: 200_000, views: 20_000_000, comments: 5000 }, postedAt: minsAgo(5) });
  const quiet = post({ id: 'quiet', engagement: { likes: 40, shares: 2, views: 300, comments: 1 }, postedAt: minsAgo(300) });

  const scoreViral = computeViralityScore([viral], now);
  const scoreQuiet = computeViralityScore([quiet], now);

  assert.ok(scoreViral > scoreQuiet, 'viral post must outrank quiet post');
  assert.ok(scoreViral >= 0 && scoreViral <= 100, 'virality must stay in 0-100');
  assert.ok(scoreQuiet >= 0 && scoreQuiet <= 100);
  assert.ok(computeEngagementScore([viral]) > computeEngagementScore([quiet]));
});

test('6. Virality is never conflated with truth: high-virality social-only evidence stays unverified', () => {
  const viral = post({ id: 'viral', engagement: { likes: 2_000_000, shares: 400_000, views: 40_000_000, comments: 9000 }, postedAt: minsAgo(5) });
  const scores = buildScores([viral], now);

  assert.ok(scores.viralityScore >= 60, 'precondition: this fixture is highly viral');
  const status = classifyVerification({
    trustedCorroborations: 0,
    officialStatements: [],
    conflictingSources: [],
    factCheckDenials: 0,
    hasSocialEvidence: true,
  });
  assert.strictEqual(status, 'SOCIAL_ONLY', 'high virality alone must never verify a story');
});

test('7. VERIFIED requires 3+ trusted corroborations (or official confirmation with 2+)', async () => {
  const service = VERIFY([
    { title: 'Mumbai Fire Brigade: fire at Bandra-Kurla Complex under control', source: 'Mumbai Fire Brigade' },
    { title: 'Massive fire at Bandra-Kurla Complex in Mumbai, evacuation underway', source: 'Times of India' },
    { title: 'Fire reported at Bandra-Kurla Complex, Mumbai, evacuation underway', source: 'NDTV' },
  ]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai', 'Bandra-Kurla Complex'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'VERIFIED');
  assert.ok(result.trustedCorroborations >= 3);
  assert.ok(result.officialStatements.length >= 1);
});

test('8. CORROBORATED requires 2 trusted corroborations without official confirmation', async () => {
  const service = VERIFY([
    { title: 'Massive fire at Bandra-Kurla Complex in Mumbai, evacuation underway', source: 'Times of India' },
    { title: 'Fire reported at Bandra-Kurla Complex, Mumbai, evacuation underway', source: 'NDTV' },
  ]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'CORROBORATED');
  assert.strictEqual(result.trustedCorroborations, 2);
});

test('9. DEVELOPING requires exactly one trusted corroboration', async () => {
  const service = VERIFY([{ title: 'Fire at Bandra-Kurla Complex in Mumbai, evacuation underway', source: 'Times of India' }]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'DEVELOPING');
  assert.strictEqual(result.trustedCorroborations, 1);
});

test('10. SOCIAL_ONLY when no trusted reporting exists yet', async () => {
  const service = VERIFY([]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'SOCIAL_ONLY');
  assert.strictEqual(result.trustedCorroborations, 0);
});

test('11. UNVERIFIED when corroboration is mixed with contradiction', async () => {
  const service = VERIFY([
    { title: 'Massive fire at Bandra-Kurla Complex in Mumbai, evacuation underway', source: 'Times of India' },
    { title: 'Denied: reports of massive fire at Bandra-Kurla Complex in Mumbai', source: 'Hindustan Times' },
  ]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'UNVERIFIED');
  assert.ok(result.conflictingSources.length >= 1);
  assert.ok(computeConflictScore(result.conflictingSources) > 0);
});

test('12. FALSE_MISLEADING when a fact-check organization debunks the claim', async () => {
  const service = VERIFY([{ title: 'Fake: No massive fire at Bandra-Kurla Complex in Mumbai, old video reshared', source: 'Boomlive' }]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'FALSE_MISLEADING');
  assert.ok(result.factCheckDenials >= 1);
});

test('13. FALSE_MISLEADING when an official source contradicts the claim', async () => {
  const service = VERIFY([{ title: 'Mumbai Police deny reports of massive fire at Bandra-Kurla Complex', source: 'Mumbai Police' }]);
  const result = await service.verifySignal({ claim: FIRE_CLAIM, entities: ['Mumbai'], location: 'Mumbai', posts: FIRE_POSTS, matches: [] });
  assert.strictEqual(result.verificationStatus, 'FALSE_MISLEADING');
  assert.ok(result.conflictingSources.some((s) => s.type === 'official'), 'official contradiction must be flagged');
});

test('14. A Tier-D social account cannot independently verify a story', () => {
  assert.strictEqual(computeSourceReliabilityScore([post({ accountTier: 'D' })]), 35, 'D-tier evidence caps reliability at 35');
  assert.strictEqual(computeSourceReliabilityScore([post({ accountTier: 'A' })]), 100);
  const scores = buildScores([post({ accountTier: 'D', engagement: { likes: 9_000_000, views: 90_000_000 } })], now);
  assert.ok(scores.viralityScore > 50, 'virality can be large...');
  assert.strictEqual(scores.sourceReliabilityScore, 35, '...but authority stays low');
  const status = classifyVerification({ trustedCorroborations: 0, officialStatements: [], conflictingSources: [], factCheckDenials: 0, hasSocialEvidence: true });
  assert.strictEqual(status, 'SOCIAL_ONLY', 'Tier-D alone never upgrades verification');
  assert.ok(computeEvidenceScore([post({ mediaUrls: ['x.jpg'], location: 'Mumbai' }), post({})]) > 20);
  assert.strictEqual(computeCorroborationScore(2, []), 40);
});

test('15. getSocialSignals degrades gracefully (empty, non-blocking) when no provider is available', async () => {
  const verification = VERIFY([]);
  const service = new SocialSignalService([new InstagramSignalProvider()], { verification });
  const payload = await service.getSocialSignals('india');
  assert.ok(Array.isArray(payload.signals), 'must always return a signals array');
  assert.strictEqual(payload.signals.length, 0, 'no available provider -> no fabricated signals');
  assert.strictEqual(payload.rawPostsCollected, 0);
  assert.deepStrictEqual(payload.providers, []);
});

test('16. getSocialSignals serves the cached response and does not re-fetch on a fresh cache hit', async () => {
  const provider = new FakeProvider(FIRE_POSTS);
  const verification = VERIFY([]);
  const service = new SocialSignalService([provider], { verification });

  const first = await service.getSocialSignals('world');
  assert.ok(first.signals.length > 0, 'cached scope should produce signals from the fake provider');
  const countAfterFirst = provider.fetchCount;

  const second = await service.getSocialSignals('world');
  assert.strictEqual(second.signals.length, first.signals.length, 'cache hit must return the same payload');
  assert.strictEqual(provider.fetchCount, countAfterFirst, 'a fresh cache hit must not re-invoke the provider');
  assert.ok(second.signals.every((s) => s.verificationStatus), 'every signal must carry a verification status');
});

test('17. Search queries are built from entities + location, and heuristics tag official sources', () => {
  const q = buildSearchQuery(FIRE_CLAIM, ['Mumbai', 'Bandra-Kurla Complex'], 'Mumbai');
  assert.ok(q.toLowerCase().includes('mumbai'));
  const official = articleToSearchMatch({ title: 'Fire reported at Bandra-Kurla Complex', source: 'Mumbai Police' });
  assert.strictEqual(official.official, true);
  assert.strictEqual(official.tier, 'A');
  const factCheck = articleToSearchMatch({ title: 'Fake: fire reports at Bandra-Kurla Complex', source: 'Alt News' });
  assert.strictEqual(factCheck.factCheck, true);
  assert.strictEqual(factCheck.contradictory, true);
  assert.strictEqual(factCheck.tier, 'B');
});

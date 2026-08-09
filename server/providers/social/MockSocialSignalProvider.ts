import {
  SocialSignalFetchOptions,
  SocialSignalPost,
  SocialSignalProvider,
} from './SocialSignalTypes.js';

/**
 * MOCK social-signal provider for local development and automated tests.
 *
 * This provider is ONLY enabled when SOCIAL_SIGNAL_MOCK_ENABLED=true (or when a
 * service is constructed with it injected explicitly, as the test suite does).
 * It is never part of the default production provider set.
 *
 * Every post it returns is marked with `mock: true` downstream, and the content
 * is synthetic fixture text — never real news, never presented as verified.
 */
export class MockSocialSignalProvider implements SocialSignalProvider {
  public readonly name = 'Mock Social Signals';
  public readonly platform = 'web' as const;

  private fixtures(): SocialSignalPost[] {
    const now = Date.now();
    const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

    return [
      {
        id: 'mock_mum_incident_1',
        platform: 'instagram',
        accountName: 'MumbaiCitizenWatch',
        accountHandle: '@mumbaicitizenwatch',
        accountTier: 'D',
        url: 'https://example.test/posts/mock_mum_incident_1',
        postedAt: iso(25),
        text: 'Major incident happening in Mumbai near Gateway, traffic blocked. Can anyone confirm?',
        mediaUrls: ['https://example.test/media/mock_mum_1.jpg'],
        mediaTypes: ['image'],
        engagement: { likes: 12400, shares: 3200, views: 482000, comments: 410 },
        location: 'Mumbai',
        category: 'Breaking Incidents',
        language: 'en',
      },
      {
        id: 'mock_mum_incident_2',
        platform: 'instagram',
        accountName: 'MumbaiBreakingHub',
        accountHandle: '@mumbaibreakinghub',
        accountTier: 'D',
        url: 'https://example.test/posts/mock_mum_incident_2',
        postedAt: iso(28),
        text: 'Major incident happening in Mumbai near Gateway, traffic blocked. Waiting for official update.',
        mediaUrls: ['https://example.test/media/mock_mum_1.jpg'],
        mediaTypes: ['image'],
        engagement: { likes: 8900, shares: 2100, views: 310000, comments: 260 },
        location: 'Mumbai',
        category: 'Breaking Incidents',
        language: 'en',
      },
      {
        id: 'mock_bengaluru_flood_1',
        platform: 'x',
        accountName: 'Bengaluru Weather Watch',
        accountHandle: '@blrweatherwatch',
        accountTier: 'D',
        url: 'https://example.test/posts/mock_bengaluru_flood_1',
        postedAt: iso(140),
        text: 'Severe waterlogging reported on Outer Ring Road, Bengaluru after heavy rain. Commuters stranded.',
        engagement: { likes: 5400, shares: 1900, views: 220000, comments: 330 },
        location: 'Bengaluru',
        category: 'Natural Disasters',
        language: 'en',
      },
      {
        id: 'mock_delhi_power_1',
        platform: 'instagram',
        accountName: 'DelhiLocalReports',
        accountHandle: '@delhilocalreports',
        accountTier: 'D',
        url: 'https://example.test/posts/mock_delhi_power_1',
        postedAt: iso(300),
        text: 'Power outage across large parts of South Delhi after a reported grid fault.',
        engagement: { likes: 2100, shares: 900, views: 98000, comments: 150 },
        location: 'Delhi',
        category: 'Infrastructure Incidents',
        language: 'en',
      },
    ];
  }

  isAvailable(): boolean {
    return process.env.SOCIAL_SIGNAL_MOCK_ENABLED === 'true';
  }

  async fetchSignals(options?: SocialSignalFetchOptions): Promise<SocialSignalPost[]> {
    const sinceMs = options?.since ? new Date(options.since).getTime() : 0;
    const limit = options?.limit ?? 50;
    const posts = this.fixtures()
      .filter((p) => new Date(p.postedAt).getTime() >= sinceMs)
      .slice(0, limit);
    // Give callers a way to recognize mock evidence end-to-end.
    return posts.map((p) => ({ ...p, id: `mock_${p.id}` }));
  }
}

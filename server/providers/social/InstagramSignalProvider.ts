import {
  SocialProviderUnavailableError,
  SocialProviderRateLimitError,
  SocialProviderTimeoutError,
  SocialSignalFetchOptions,
  SocialSignalPost,
  SocialSignalProvider,
} from './SocialSignalTypes.js';

/**
 * Instagram social-signal adapter.
 *
 * IMPORTANT (compliance):
 *  - PulseAI does NOT scrape Instagram, bypass authentication, robots, or rate
 *    limits, and does NOT access private accounts.
 *  - There is currently no official Instagram API surface that PulseAI is
 *    authorized to call, so this adapter reports UNAVAILABLE by default and
 *    returns no data. No fake posts are ever generated.
 *  - It is a clean seam: if a legally/technically approved source becomes
 *    available (e.g. an authorized Graph API app with the relevant scope, or a
 *    compliant third-party/aggregator endpoint), it can be enabled purely via
 *    environment configuration without touching the rest of the pipeline:
 *      INSTAGRAM_SOCIAL_API_URL=...
 *      INSTAGRAM_SOCIAL_API_TOKEN=...
 *    The operator is responsible for ensuring the configured endpoint is
 *    authorized. Without both variables the provider stays disabled.
 */
export class InstagramSignalProvider implements SocialSignalProvider {
  public readonly name = 'Instagram';
  public readonly platform = 'instagram' as const;

  private readonly apiUrl = process.env.INSTAGRAM_SOCIAL_API_URL || '';
  private readonly apiToken = process.env.INSTAGRAM_SOCIAL_API_TOKEN || '';

  isAvailable(): boolean {
    // Only claim availability when an authorized endpoint + token are configured.
    return Boolean(this.apiUrl && this.apiToken);
  }

  async fetchSignals(_options?: SocialSignalFetchOptions): Promise<SocialSignalPost[]> {
    if (!this.isAvailable()) {
      throw new SocialProviderUnavailableError(
        this.name,
        'No authorized Instagram API endpoint/token configured. Set INSTAGRAM_SOCIAL_API_URL and INSTAGRAM_SOCIAL_API_TOKEN to enable an approved source.'
      );
    }

    const response = await fetch(this.apiUrl, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 429) {
      throw new SocialProviderRateLimitError(this.name);
    }
    if (!response.ok) {
      throw new SocialProviderUnavailableError(this.name, `HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return this.normalizePayload(payload);
  }

  /** Map an approved provider payload into normalized SocialSignalPost rows. */
  private normalizePayload(payload: unknown): SocialSignalPost[] {
    if (!payload || !Array.isArray(payload)) return [];
    return payload
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => ({
        id: `ig_${item.id ?? String(index)}`,
        platform: this.platform as SocialSignalPost['platform'],
        accountName: String(item.accountName ?? item.author ?? 'Unknown account'),
        accountHandle: item.accountHandle ? String(item.accountHandle) : undefined,
        accountTier: 'D' as const,
        url: item.url ? String(item.url) : undefined,
        postedAt: String(item.postedAt ?? item.timestamp ?? new Date().toISOString()),
        text: String(item.text ?? item.caption ?? ''),
        mediaUrls: Array.isArray(item.mediaUrls) ? item.mediaUrls.map(String) : undefined,
        mediaTypes: Array.isArray(item.mediaTypes) ? item.mediaTypes.map(String) : undefined,
        engagement: item.engagement && typeof item.engagement === 'object' ? (item.engagement as SocialSignalPost['engagement']) : undefined,
        location: item.location ? String(item.location) : undefined,
        category: item.category ? String(item.category) : undefined,
        language: item.language ? String(item.language) : undefined,
      }))
      .filter((p) => p.text.trim().length > 0);
  }
}

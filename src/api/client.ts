const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_BASE = `${BASE_URL}/api/v1`;

export class ApiError extends Error {
  status: number;
  code?: string;
  limitType?: string;
  constructor(message: string, status: number, code?: string, limitType?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.limitType = limitType;
  }
}

function getOrCreateGuestId(): string {
  let guestId = localStorage.getItem('pulse_guest_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('pulse_guest_id', guestId);
  }
  return guestId;
}

/**
 * Lightweight stale-while-revalidate cache for GET /news/* responses.
 *
 * React-Query-equivalent semantics:
 *   - staleTime: per-endpoint fresh window. Within it, hits return instantly
 *     with zero network work (no background refetch).
 *   - stale + gcTime: hits return instantly while a background refetch
 *     repopulates the cache (stale-while-revalidate).
 *   - gcTime: entries untouched beyond this window are evicted on the next
 *     access (drop the whole entry, not just freshness) so the map cannot grow
 *     unbounded across many searches/scopes.
 *
 * The `/news/feed` endpoint is personalized per user, so its cache key is
 * scoped to the auth state: after login the personalized feed is fetched fresh
 * (single refetch, no duplicate) while the guest entry stays preserved for a
 * later guest session. This is what "preserve guest cache after login" means.
 */
const NEWS_CACHE_STALE_MS = 10 * 60 * 1000;
const NEWS_GC_MS = 30 * 60 * 1000;
const NEWS_CACHE_MAX_ENTRIES = 60;
const NEWS_FRESH_OVERRIDES: Record<string, number> = {
  '/news/search': 30 * 1000,
  '/news/trending': 2 * 60 * 1000,
  '/news/clusters': 2 * 60 * 1000,
  '/news/feed': 60 * 1000,
};
const newsCache = new Map<string, { data: unknown; expiresAt: number; lastUsed: number }>();
const newsRefreshing = new Set<string>();

function isCacheableNewsGet(endpoint: string, method: string): boolean {
  return method === 'GET' && endpoint.startsWith('/news/');
}

function newsFreshMs(endpoint: string): number {
  const base = endpoint.split('?')[0];
  return NEWS_FRESH_OVERRIDES[base] ?? 60 * 1000;
}

function newsCacheKey(endpoint: string): string {
  const base = `${API_BASE}${endpoint}`;
  // Feed ranking depends on the signed-in user's interests; everything else is
  // user-agnostic. Scoping the feed key by auth state avoids serving a stale
  // guest-ranked feed after login while keeping the guest entry cached.
  if (endpoint.startsWith('/news/feed')) {
    const authed = localStorage.getItem('pulse_token') ? 'u' : 'g';
    return `${base}__${authed}`;
  }
  return base;
}

function evictNewsCache(now: number): void {
  if (newsCache.size < NEWS_CACHE_MAX_ENTRIES) {
    // Opportunistically drop long-dead entries even under the cap.
    for (const [key, entry] of newsCache) {
      if (now - entry.lastUsed > NEWS_GC_MS) {
        newsCache.delete(key);
      }
    }
    return;
  }
  // Over the cap: evict the least-recently-used entries until back under.
  const sorted = [...newsCache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  const toEvict = sorted.slice(0, Math.max(5, sorted.length - NEWS_CACHE_MAX_ENTRIES));
  for (const [key] of toEvict) {
    newsCache.delete(key);
  }
}

function logPerf(label: string, ms: number, detail = ''): void {
  const width = 28;
  const padded = label.length >= width ? label.slice(0, width) : label.padEnd(width, '.');
  console.log(`[perf] ${padded} ${Math.round(ms)}ms${detail ? ` (${detail})` : ''}`);
}

async function requestInner<T>(endpoint: string, options: RequestInit): Promise<T> {
  const token = localStorage.getItem('pulse_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-guest-id': getOrCreateGuestId(),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (
      response.status === 401 &&
      token &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register')
    ) {
      // Session is invalid/expired: clear token and notify the app so UI state stays in sync.
      localStorage.removeItem('pulse_token');
      window.dispatchEvent(new Event('pulse:session-expired'));
    }
    throw new ApiError(data.error || 'Request failed', response.status, data.code, data.limitType);
  }

  return data as T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const t0 = performance.now();

  if (isCacheableNewsGet(endpoint, method)) {
    const now = Date.now();
    const cacheKey = newsCacheKey(endpoint);
    const cached = newsCache.get(cacheKey);
    const freshMs = newsFreshMs(endpoint);

    if (cached) {
      cached.lastUsed = now;
      if (now < cached.expiresAt) {
        logPerf(`Cache hit (fresh) ${endpoint.split('?')[0]}`, performance.now() - t0);
        return cached.data as T;
      }
      if (now < cached.expiresAt + NEWS_CACHE_STALE_MS) {
        logPerf(`Cache hit (stale) ${endpoint.split('?')[0]}`, performance.now() - t0);
        if (!newsRefreshing.has(cacheKey)) {
          newsRefreshing.add(cacheKey);
          requestInner<T>(endpoint, options)
            .then((data) => {
              newsCache.set(cacheKey, { data, expiresAt: Date.now(), lastUsed: Date.now() });
            })
            .catch(() => {})
            .finally(() => {
              newsRefreshing.delete(cacheKey);
            });
        }
        return cached.data as T;
      }
    }

    // Full miss (or entry beyond the stale window): fetch and fill.
    const data = await requestInner<T>(endpoint, options);
    logPerf(`Cache miss ${endpoint.split('?')[0]}`, performance.now() - t0);
    newsCache.set(cacheKey, { data, expiresAt: Date.now(), lastUsed: Date.now() });
    evictNewsCache(Date.now());
    return data;
  }

  const data = await requestInner<T>(endpoint, options);
  logPerf(`API ${endpoint}`, performance.now() - t0);
  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

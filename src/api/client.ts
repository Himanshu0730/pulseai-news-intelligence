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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('pulse_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Server ignores x-guest-id for enforcement; used for analytics only
    'x-guest-id': getOrCreateGuestId(),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let retries = 1;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 401 &&
          !endpoint.includes('/auth/login') &&
          !endpoint.includes('/auth/register') &&
          !endpoint.includes('/auth/refresh')
        ) {
          localStorage.removeItem('pulse_token');
        }
        if (retries > 0 && response.status >= 500) {
          retries--;
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw new ApiError(data.error || 'Request failed', response.status, data.code, data.limitType);
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Request timed out', 408, 'TIMEOUT');
      }
      if (retries > 0) {
        retries--;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

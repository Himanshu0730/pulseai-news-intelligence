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
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      // Clear token on 401
      localStorage.removeItem('pulse_token');
    }
    throw new ApiError(data.error || 'Request failed', response.status, data.code, data.limitType);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

import type { OwnerQueue, PublicEntry, PublicQueue } from '../types';

type ErrorEnvelope = { error?: { code?: string; message?: string; requestId?: string } };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'UNKNOWN_ERROR',
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');

  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorEnvelope;
    throw new ApiError(
      body.error?.message ?? 'The request failed. Please try again.',
      response.status,
      body.error?.code,
      body.error?.requestId,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  getPublicQueue: (slug: string) => request<PublicQueue>(`/api/v1/shops/${slug}/queue`),

  joinQueue: (slug: string, input: { name: string; phone: string }) =>
    request<{ entryToken: string; entry: PublicEntry }>(`/api/v1/shops/${slug}/queue/entries`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getEntry: (slug: string, token: string) =>
    request<{ entry: PublicEntry; updatedAt: string }>(
      `/api/v1/shops/${slug}/queue/entries/${token}`,
    ),

  login: (password: string) =>
    request<{ shop: { name: string; slug: string } }>('/api/v1/owner/session', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logout: () => request<void>('/api/v1/owner/session', { method: 'DELETE' }),

  getOwnerQueue: () => request<OwnerQueue>('/api/v1/owner/queue'),

  advanceQueue: (expectedServingEntryId: string | null) =>
    request<OwnerQueue>('/api/v1/owner/queue/next', {
      method: 'POST',
      body: JSON.stringify({ expectedServingEntryId }),
    }),

  markNoShow: (entryId: string) =>
    request<OwnerQueue>(`/api/v1/owner/queue/entries/${entryId}/no-show`, { method: 'POST' }),
};

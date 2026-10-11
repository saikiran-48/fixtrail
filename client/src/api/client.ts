// Thin wrapper around fetch. Sends the session cookie, parses JSON, and turns
// the API's { error: { code, message } } shape into a readable Error.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const BASE = '/api';

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'UNKNOWN',
      data?.error?.message ?? 'Something went wrong. Please try again.',
    );
  }
  return data as T;
}

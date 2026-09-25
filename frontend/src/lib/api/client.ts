import type { ApiError } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details: ApiError['details'],
  ) {
    super(`[${status}] ${code}`);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({
      statusCode: res.status,
      code: 'INTERNAL_ERROR',
      message: res.statusText,
      details: [],
    }));
    throw new ApiRequestError(body.statusCode, body.code, body.details);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

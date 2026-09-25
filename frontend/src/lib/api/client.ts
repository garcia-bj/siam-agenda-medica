import type { ApiError } from '@/types/api';
import { handleMock } from './mocks';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiError['details'],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (USE_MOCKS) {
    return handleMock<T>(path, options);
  }

  const url = `${BASE_URL}${path}`;
  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'No se pudo conectar con el servidor';
    throw new ApiRequestError(500, 'INTERNAL_ERROR', msg, []);
  }

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({
      statusCode: res.status,
      code: 'INTERNAL_ERROR',
      message: res.statusText,
      details: [],
    }));
    throw new ApiRequestError(body.statusCode, body.code, body.message, body.details);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

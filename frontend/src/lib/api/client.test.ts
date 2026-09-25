import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiRequestError } from './client';

describe('client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset process.env for tests
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('transforms backend error into ApiRequestError', async () => {
    const errorBody = {
      statusCode: 409,
      code: 'SLOT_TAKEN',
      message: 'El horario ya está ocupado para Pediatría',
      details: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => errorBody,
    });

    try {
      await apiFetch('/appointments', { method: 'POST' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('SLOT_TAKEN');
        expect(error.message).toBe('El horario ya está ocupado para Pediatría');
        expect(error.details).toEqual([]);
      }
    }
  });

  it('handles network errors properly', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    try {
      await apiFetch('/health');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.message).toBe('Network disconnected');
      }
    }
  });
});

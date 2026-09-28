import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadReport } from './reports';
import { ApiRequestError } from './client';

// Forzar que no se usen mocks para poder testear el fetch real.
// vitest usa import.meta.env pero NEXT_PUBLIC_USE_MOCKS viene de process.env.
const originalEnv = process.env.NEXT_PUBLIC_USE_MOCKS;

describe('downloadReport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let clickMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    clickMock = vi.fn();
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const a = createElementOriginal('a');
        a.click = clickMock;
        return a;
      }
      return createElementOriginal(tagName);
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCKS = originalEnv;
    vi.restoreAllMocks();
  });

  it('uses filename from Content-Disposition header', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['test']),
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="siam-citas_2026-09-28_2026-10-02.csv"',
      }),
    });

    await downloadReport({ from: '2026-09-28', to: '2026-10-02', format: 'csv' });

    expect(clickMock).toHaveBeenCalled();
    const anchor = clickMock.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('siam-citas_2026-09-28_2026-10-02.csv');
  });

  it('uses fallback filename if header is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['test']),
      headers: new Headers(),
    });

    await downloadReport({ from: '2026-01-01', to: '2026-01-31', format: 'xlsx' });

    expect(clickMock).toHaveBeenCalled();
    const anchor = clickMock.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('reporte-2026-01-01-2026-01-31.xlsx');
  });

  it('revokes the same URL that was created', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['test']),
      headers: new Headers(),
    });

    await downloadReport({ format: 'csv' });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('throws ApiRequestError on 400 error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ code: 'VALIDATION_ERROR', message: 'Datos inválidos' }),
    });

    await expect(downloadReport({ format: 'csv' })).rejects.toThrow(ApiRequestError);
    await expect(downloadReport({ format: 'csv' })).rejects.toThrow('Datos inválidos');
    
    try {
      await downloadReport({ format: 'csv' });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        expect(error.code).toBe('VALIDATION_ERROR');
      } else {
        throw new Error('Should be ApiRequestError');
      }
    }
  });

  it('sends correct query parameters and omits specialty if undefined, and does not send credentials: include', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['test']),
      headers: new Headers(),
    });

    await downloadReport({ from: '2026-09-01', to: '2026-09-30', status: 'ACTIVE', format: 'csv' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0] as string;
    const options = callArgs[1] as RequestInit;

    expect(url).toContain('from=2026-09-01');
    expect(url).toContain('to=2026-09-30');
    expect(url).toContain('status=ACTIVE');
    expect(url).toContain('format=csv');
    expect(url).not.toContain('specialty=');

    // fetch shouldn't receive credentials: 'include'
    expect(options?.credentials).not.toBe('include');
  });
});

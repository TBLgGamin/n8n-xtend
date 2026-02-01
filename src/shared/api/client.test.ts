import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, patch, request } from './client';

function mockLocation(origin = 'http://localhost'): void {
  Object.defineProperty(globalThis, 'location', {
    value: { origin, pathname: '/', hostname: 'localhost' },
    writable: true,
    configurable: true,
  });
}

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const error = new ApiError('Not Found', 404);
    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  it('is instanceof Error', () => {
    const error = new ApiError('Error', 500);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('request', () => {
  beforeEach(() => {
    mockLocation('http://localhost:5678');
    localStorage.setItem('n8n-browserId', 'test-browser-id');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('makes GET request with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse({ data: 'test' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/rest/test',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'browser-id': 'test-browser-id',
        }),
      }),
    );
    expect(result).toEqual({ data: 'test' });
  });

  it('throws ApiError for non-ok response', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 404)) as unknown as typeof fetch;

    await vi.runAllTimersAsync();

    await expect(request('/rest/test')).rejects.toThrow(ApiError);
  });

  it('retries on 500 error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 500))
      .mockResolvedValueOnce(createMockResponse({ data: 'success' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'success' });
  });

  it('retries on 502 error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 502))
      .mockResolvedValueOnce(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'ok' });
  });

  it('retries on 503 error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 503))
      .mockResolvedValueOnce(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'ok' });
  });

  it('retries on 504 error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 504))
      .mockResolvedValueOnce(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'ok' });
  });

  it('retries on 408 timeout error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 408))
      .mockResolvedValueOnce(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'ok' });
  });

  it('retries on 429 rate limit error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 429))
      .mockResolvedValueOnce(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'ok' });
  });

  it('does not retry on 400 error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 400)) as unknown as typeof fetch;

    await vi.runAllTimersAsync();

    await expect(request('/rest/test')).rejects.toThrow('HTTP 400');
  });

  it('does not retry on 401 error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 401)) as unknown as typeof fetch;

    await vi.runAllTimersAsync();

    await expect(request('/rest/test')).rejects.toThrow('HTTP 401');
  });

  it('does not retry on 403 error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 403)) as unknown as typeof fetch;

    await vi.runAllTimersAsync();

    await expect(request('/rest/test')).rejects.toThrow('HTTP 403');
  });

  it('throws timeout error after max retries', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 500)) as unknown as typeof fetch;

    const promise = request('/rest/test');
    const expectation = expect(promise).rejects.toThrow('Request timeout');
    await vi.advanceTimersByTimeAsync(10000);

    await expectation;
  });

  it('handles abort error from timeout', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ data: 'ok' });
  });

  it('throws non-abort errors immediately', async () => {
    const networkError = new Error('Network error');
    globalThis.fetch = vi.fn().mockRejectedValue(networkError) as unknown as typeof fetch;

    await expect(request('/rest/test')).rejects.toThrow('Network error');
  });

  it('uses empty browser-id when not set', async () => {
    localStorage.clear();
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse({ data: 'test' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = request('/rest/test');
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'browser-id': '',
        }),
      }),
    );
  });
});

describe('patch', () => {
  beforeEach(() => {
    mockLocation('http://localhost:5678');
    localStorage.setItem('n8n-browserId', 'test-browser-id');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('makes PATCH request with body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse({ data: 'updated' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = patch('/rest/workflows/123', { name: 'New Name' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5678/rest/workflows/123',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ name: 'New Name' }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual({ data: 'updated' });
  });

  it('throws ApiError for non-ok response', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 422)) as unknown as typeof fetch;

    await expect(patch('/rest/test', { data: 'test' })).rejects.toThrow('HTTP 422');
  });

  it('retries on server errors', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({}, 503))
      .mockResolvedValueOnce(createMockResponse({ success: true }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const promise = patch('/rest/test', { value: 1 });
    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  it('sends complex body correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse({ data: 'ok' }));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const body = {
      parentFolderId: 'folder-123',
      versionId: 'v1',
      nested: { key: 'value' },
    };

    const promise = patch('/rest/workflows/abc', body);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(body),
      }),
    );
  });
});

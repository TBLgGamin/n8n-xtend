import { vi } from 'vitest';

export interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

export type FetchMockHandler = (
  url: string,
  options?: RequestInit,
) => Promise<MockResponse> | MockResponse;

let fetchMockHandler: FetchMockHandler | null = null;
let originalFetch: typeof globalThis.fetch | null = null;

export function setFetchHandler(handler: FetchMockHandler): void {
  fetchMockHandler = handler;
}

export function createMockResponse(data: unknown, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

export function createErrorResponse(status: number, message = 'Error'): MockResponse {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  };
}

export function setupFetchMock(): void {
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (fetchMockHandler) {
      return fetchMockHandler(url, init) as Response;
    }
    return createMockResponse({}) as Response;
  }) as unknown as typeof fetch;
}

export function resetFetchMock(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
  fetchMockHandler = null;
}

export function mockFetchOnce(response: MockResponse): void {
  const currentHandler = fetchMockHandler;
  let called = false;
  setFetchHandler((url, options) => {
    if (!called) {
      called = true;
      return response;
    }
    if (currentHandler) {
      return currentHandler(url, options);
    }
    return createMockResponse({});
  });
}

export function mockFetchSequence(responses: MockResponse[]): void {
  let index = 0;
  setFetchHandler(() => {
    const response = responses[index] ?? createMockResponse({});
    if (index < responses.length) {
      index++;
    }
    return response;
  });
}

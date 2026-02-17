import { logger } from '@/shared/utils/logger';
import { isN8nHost } from '@/shared/utils/url';

const log = logger.child('api:client');

const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const BROWSER_ID_KEY = 'n8n-browserId';

function getBrowserId(): string {
  return localStorage.getItem(BROWSER_ID_KEY) ?? '';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function assertTrustedOrigin(): void {
  if (!isN8nHost()) {
    log.error('Blocked request to untrusted origin');
    throw new ApiError('Untrusted origin', 403);
  }
}

function getHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'browser-id': getBrowserId(),
  };
}

function isRetryable(status: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(status);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface AttemptResult {
  response: Response | null;
  status: number;
}

async function attemptFetch(url: string, options: RequestInit): Promise<AttemptResult> {
  try {
    const response = await fetchWithTimeout(url, options);
    if (response.ok || !isRetryable(response.status)) {
      return { response, status: response.status };
    }
    return { response: null, status: response.status };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { response: null, status: 408 };
    }
    throw error;
  }
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastStatus = 408;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      log.debug(`Retrying request (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, { url });
    }

    const result = await attemptFetch(url, options);
    if (result.response) {
      return result.response;
    }
    lastStatus = result.status;
    if (attempt < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  log.warn(`Request failed after ${MAX_RETRIES + 1} attempts`, { url, status: lastStatus });
  throw new ApiError(`Request failed with status ${lastStatus}`, lastStatus);
}

function validateResponse<T>(data: unknown): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new ApiError('Invalid API response', 500);
  }
  return data as T;
}

export async function request<T>(endpoint: string): Promise<T> {
  assertTrustedOrigin();
  log.debug(`GET ${endpoint}`);
  const response = await fetchWithRetry(location.origin + endpoint, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (!response.ok) {
    log.debug(`GET ${endpoint} failed`, { status: response.status });
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return validateResponse<T>(await response.json());
}

export async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  assertTrustedOrigin();
  log.debug(`POST ${endpoint}`);
  const response = await fetchWithRetry(location.origin + endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    log.debug(`POST ${endpoint} failed`, { status: response.status });
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return validateResponse<T>(await response.json());
}

export async function patch<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  assertTrustedOrigin();
  log.debug(`PATCH ${endpoint}`);
  const response = await fetchWithRetry(location.origin + endpoint, {
    method: 'PATCH',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    log.debug(`PATCH ${endpoint} failed`, { status: response.status });
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return validateResponse<T>(await response.json());
}

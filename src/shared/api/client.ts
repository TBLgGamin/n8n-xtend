import { getBrowserId } from '@/shared/utils/storage';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
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
    const result = await attemptFetch(url, options);
    if (result.response) {
      return result.response;
    }
    lastStatus = result.status;
    if (attempt < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw new ApiError(`Request failed with status ${lastStatus}`, lastStatus);
}

export async function request<T>(endpoint: string): Promise<T> {
  const response = await fetchWithRetry(location.origin + endpoint, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export async function patch<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithRetry(location.origin + endpoint, {
    method: 'PATCH',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return response.json();
}

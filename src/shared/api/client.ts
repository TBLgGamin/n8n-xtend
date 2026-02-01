import { getBrowserId } from '@/shared/utils/storage';

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

export async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(location.origin + endpoint, {
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
  const response = await fetch(location.origin + endpoint, {
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

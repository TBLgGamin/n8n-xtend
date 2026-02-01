const BROWSER_ID_KEY = 'n8n-browserId';

export function getBrowserId(): string {
  return localStorage.getItem(BROWSER_ID_KEY) ?? '';
}

export function getStorageItem<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

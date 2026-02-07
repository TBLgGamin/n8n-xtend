import {
  getItem,
  initializeDatabase,
  isReady,
  removeItem,
  setItem,
  waitForReady,
} from './database';
import { logger } from './logger';

const log = logger.child('storage');

const BROWSER_ID_KEY = 'n8n-browserId';

export function getBrowserId(): string {
  return localStorage.getItem(BROWSER_ID_KEY) ?? '';
}

export function getStorageItem<T>(key: string): T | null {
  return getItem<T>(key);
}

export function setStorageItem<T>(key: string, value: T): void {
  setItem(key, value);
}

export function removeStorageItem(key: string): void {
  removeItem(key);
}

export function isStorageReady(): boolean {
  return isReady();
}

export async function initStorage(): Promise<void> {
  log.debug('Initializing storage');
  await initializeDatabase();
  log.debug('Storage initialized');
}

export async function waitForStorage(): Promise<void> {
  return waitForReady();
}

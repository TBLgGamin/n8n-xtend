import { logger } from './logger';

const log = logger.child('chrome-storage');

const syncCache = new Map<string, unknown>();
const localCache = new Map<string, unknown>();

let initialized = false;
let initPromise: Promise<void> | null = null;

function getCache(area: 'sync' | 'local'): Map<string, unknown> {
  return area === 'sync' ? syncCache : localCache;
}

function getStorageArea(area: 'sync' | 'local'): chrome.storage.StorageArea {
  return area === 'sync' ? chrome.storage.sync : chrome.storage.local;
}

function handleStorageChange(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
): void {
  const cache = getCache(areaName as 'sync' | 'local');
  for (const [key, change] of Object.entries(changes)) {
    if (change.newValue !== undefined) {
      cache.set(key, change.newValue);
    } else {
      cache.delete(key);
    }
  }
}

export async function initChromeStorage(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const [syncData, localData] = await Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(null),
    ]);

    for (const [key, value] of Object.entries(syncData)) {
      syncCache.set(key, value);
    }
    for (const [key, value] of Object.entries(localData)) {
      localCache.set(key, value);
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    initialized = true;
    log.debug('Chrome storage initialized');
  })();

  return initPromise;
}

export function isChromeStorageReady(): boolean {
  return initialized;
}

export async function waitForChromeStorage(): Promise<void> {
  if (initialized) return;
  return initChromeStorage();
}

export function getSyncItem<T>(key: string): T | null {
  const value = syncCache.get(key);
  return value !== undefined ? (value as T) : null;
}

export function setSyncItem<T>(key: string, value: T): void {
  syncCache.set(key, value);
  chrome.storage.sync.set({ [key]: value }).catch((error) => {
    log.debug(`Failed to persist sync key "${key}"`, error);
  });
}

export function removeSyncItem(key: string): void {
  syncCache.delete(key);
  chrome.storage.sync.remove(key).catch((error) => {
    log.debug(`Failed to remove sync key "${key}"`, error);
  });
}

export function getLocalItem<T>(key: string): T | null {
  const value = localCache.get(key);
  return value !== undefined ? (value as T) : null;
}

export function setLocalItem<T>(key: string, value: T): void {
  localCache.set(key, value);
  chrome.storage.local.set({ [key]: value }).catch((error) => {
    log.debug(`Failed to persist local key "${key}"`, error);
  });
}

export function removeLocalItem(key: string): void {
  localCache.delete(key);
  chrome.storage.local.remove(key).catch((error) => {
    log.debug(`Failed to remove local key "${key}"`, error);
  });
}

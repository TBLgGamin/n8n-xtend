import Dexie, { type EntityTable } from 'dexie';
import { logger } from './logger';
import { sanitizeObject } from './validation';

const log = logger.child('database');

interface StorageEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

const DB_NAME = 'n8n-xtend';
const DB_VERSION = 1;

const MIGRATION_KEYS = ['n8n-xtend-settings', 'n8ntree-expanded'];

class N8nXtendDatabase extends Dexie {
  storage!: EntityTable<StorageEntry, 'key'>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      storage: 'key',
    });
  }
}

const db = new N8nXtendDatabase();
const cache = new Map<string, unknown>();
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let isDatabaseAvailable = false;

function parseStoredValue(key: string, stored: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    log.debug(`Failed to parse JSON for key "${key}"`, error);
    return null;
  }

  if (parsed === null || typeof parsed !== 'object') {
    log.debug(`Invalid data type for key "${key}"`);
    return null;
  }

  return sanitizeObject(parsed as Record<string, unknown>);
}

async function migrateFromLocalStorage(): Promise<void> {
  for (const key of MIGRATION_KEYS) {
    const stored = localStorage.getItem(key);
    if (!stored || cache.has(key)) continue;

    try {
      const value = parseStoredValue(key, stored);
      if (!value) continue;

      cache.set(key, value);
      if (isDatabaseAvailable) {
        await db.storage.put({ key, value, updatedAt: Date.now() });
      }
      localStorage.removeItem(key);
    } catch (error) {
      log.debug(`Failed to migrate key "${key}" from localStorage`, error);
    }
  }
}

async function loadCacheFromDatabase(): Promise<void> {
  const entries = await db.storage.toArray();
  for (const entry of entries) {
    cache.set(entry.key, entry.value);
  }
}

async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await db.open();
      isDatabaseAvailable = true;
      await loadCacheFromDatabase();
    } catch (error) {
      log.debug('IndexedDB unavailable, using in-memory storage', error);
    }
    await migrateFromLocalStorage();
    isInitialized = true;
  })();

  return initPromise;
}

export function getItem<T>(key: string): T | null {
  const value = cache.get(key);
  return value !== undefined ? (value as T) : null;
}

export function setItem<T>(key: string, value: T): void {
  cache.set(key, value);
  if (isDatabaseAvailable) {
    db.storage
      .put({ key, value, updatedAt: Date.now() })
      .catch((error) => log.debug(`Failed to persist key "${key}"`, error));
  }
}

export function removeItem(key: string): void {
  cache.delete(key);
  if (isDatabaseAvailable) {
    db.storage.delete(key).catch((error) => log.debug(`Failed to delete key "${key}"`, error));
  }
}

export async function getAllKeys(): Promise<string[]> {
  return Array.from(cache.keys());
}

export function isReady(): boolean {
  return isInitialized;
}

export async function waitForReady(): Promise<void> {
  return initializeDatabase();
}

export { initializeDatabase };

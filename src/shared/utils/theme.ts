import { logger } from './logger';

const log = logger.child('theme');

const THEME_STORAGE_KEY = 'N8N_THEME';

export type Theme = 'dark' | 'light';

type ThemeChangeCallback = (theme: Theme) => void;
const themeChangeCallbacks = new Set<ThemeChangeCallback>();
let lastKnownTheme: Theme | null = null;

let observer: MutationObserver | null = null;
let storageHandler: ((e: StorageEvent) => void) | null = null;
let mediaQuery: MediaQueryList | null = null;
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

function getStoredTheme(): string | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (!stored) return null;

  if (stored === 'dark' || stored === 'light') return stored;
  if (stored === '"dark"') return 'dark';
  if (stored === '"light"') return 'light';

  try {
    const parsed = JSON.parse(stored);
    if (parsed === 'dark' || parsed === 'light') {
      return parsed;
    }
    return null;
  } catch (error) {
    log.debug('Failed to parse theme from localStorage', { error });
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getCurrentTheme(): Theme {
  const stored = getStoredTheme();

  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';

  return getSystemTheme();
}

export function isDarkMode(): boolean {
  return getCurrentTheme() === 'dark';
}

function notifyIfChanged(): void {
  const currentTheme = getCurrentTheme();
  if (lastKnownTheme !== null && lastKnownTheme !== currentTheme) {
    for (const callback of themeChangeCallbacks) {
      callback(currentTheme);
    }
  }
  lastKnownTheme = currentTheme;
}

function startListening(): void {
  if (observer) return;

  lastKnownTheme = getCurrentTheme();

  observer = new MutationObserver(notifyIfChanged);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style'],
  });
  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
  }

  storageHandler = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) {
      notifyIfChanged();
    }
  };
  window.addEventListener('storage', storageHandler);

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaHandler = () => notifyIfChanged();
  mediaQuery.addEventListener('change', mediaHandler);
}

function stopListening(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (storageHandler) {
    window.removeEventListener('storage', storageHandler);
    storageHandler = null;
  }
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener('change', mediaHandler);
    mediaQuery = null;
    mediaHandler = null;
  }
}

export function onThemeChange(callback: ThemeChangeCallback): () => void {
  const isFirst = themeChangeCallbacks.size === 0;
  themeChangeCallbacks.add(callback);

  if (isFirst) {
    startListening();
  }

  return () => {
    themeChangeCallbacks.delete(callback);
    if (themeChangeCallbacks.size === 0) {
      stopListening();
    }
  };
}

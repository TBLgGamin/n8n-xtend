const THEME_STORAGE_KEY = 'N8N_THEME';
const POLL_INTERVAL_MS = 500;

export type Theme = 'dark' | 'light';

type ThemeChangeCallback = (theme: Theme) => void;
const themeChangeCallbacks = new Set<ThemeChangeCallback>();
let lastKnownTheme: Theme | null = null;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

function getStoredTheme(): string | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (!stored) return null;

  if (stored === 'dark' || stored === 'light') return stored;
  if (stored === '"dark"') return 'dark';
  if (stored === '"light"') return 'light';

  try {
    return JSON.parse(stored) as string;
  } catch {
    return stored;
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

function notifyThemeChange(): void {
  const theme = getCurrentTheme();
  for (const callback of themeChangeCallbacks) {
    callback(theme);
  }
}

function notifyIfThemeChanged(): void {
  const currentTheme = getCurrentTheme();
  if (lastKnownTheme !== null && lastKnownTheme !== currentTheme) {
    notifyThemeChange();
  }
  lastKnownTheme = currentTheme;
}

function startThemePolling(): void {
  if (pollIntervalId !== null) return;

  lastKnownTheme = getCurrentTheme();
  pollIntervalId = setInterval(notifyIfThemeChanged, POLL_INTERVAL_MS);
}

function stopThemePolling(): void {
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

export function onThemeChange(callback: ThemeChangeCallback): () => void {
  const isFirstCallback = themeChangeCallbacks.size === 0;
  themeChangeCallbacks.add(callback);

  if (isFirstCallback) {
    startThemePolling();
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleMediaChange = () => {
    callback(getCurrentTheme());
  };

  mediaQuery.addEventListener('change', handleMediaChange);

  const storageHandler = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      callback(getCurrentTheme());
    }
  };
  window.addEventListener('storage', storageHandler);

  const observer = new MutationObserver(() => {
    callback(getCurrentTheme());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return () => {
    themeChangeCallbacks.delete(callback);
    mediaQuery.removeEventListener('change', handleMediaChange);
    window.removeEventListener('storage', storageHandler);
    observer.disconnect();

    if (themeChangeCallbacks.size === 0) {
      stopThemePolling();
    }
  };
}

let isLocalStorageIntercepted = false;

export function interceptLocalStorage(): void {
  if (isLocalStorageIntercepted) return;
  isLocalStorageIntercepted = true;

  const originalSetItem = localStorage.setItem.bind(localStorage);

  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (key === THEME_STORAGE_KEY) {
      notifyThemeChange();
    }
  };
}

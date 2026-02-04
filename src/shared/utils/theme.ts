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

function checkThemeChange(): void {
  const currentTheme = getCurrentTheme();
  if (lastKnownTheme !== null && lastKnownTheme !== currentTheme) {
    for (const callback of themeChangeCallbacks) {
      callback(currentTheme);
    }
  }
  lastKnownTheme = currentTheme;
}

function startPolling(): void {
  if (pollIntervalId !== null) return;
  lastKnownTheme = getCurrentTheme();
  pollIntervalId = setInterval(checkThemeChange, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

export function onThemeChange(callback: ThemeChangeCallback): () => void {
  const isFirst = themeChangeCallbacks.size === 0;
  themeChangeCallbacks.add(callback);

  if (isFirst) {
    startPolling();
  }

  return () => {
    themeChangeCallbacks.delete(callback);
    if (themeChangeCallbacks.size === 0) {
      stopPolling();
    }
  };
}

const THEME_STORAGE_KEY = 'N8N_THEME';

export type Theme = 'dark' | 'light';

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

export function onThemeChange(callback: (theme: Theme) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    callback(getCurrentTheme());
  };

  mediaQuery.addEventListener('change', handleChange);

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
    mediaQuery.removeEventListener('change', handleChange);
    window.removeEventListener('storage', storageHandler);
    observer.disconnect();
  };
}

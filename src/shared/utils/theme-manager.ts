import { logger } from './logger';
import { getCurrentTheme, onThemeChange } from './theme';

const log = logger.child('theme-manager');

const DARK_MODE_CLASS = 'n8n-xtend-dark';

let isInitialized = false;
let themeCleanup: (() => void) | null = null;

function updateDocumentTheme(): void {
  const isDark = getCurrentTheme() === 'dark';
  document.documentElement.classList.toggle(DARK_MODE_CLASS, isDark);
}

export function initThemeManager(): void {
  if (isInitialized) return;

  const theme = getCurrentTheme();
  log.debug('Theme manager initialized', { theme });

  updateDocumentTheme();

  themeCleanup = onThemeChange((newTheme) => {
    log.debug('Theme changed', { theme: newTheme });
    updateDocumentTheme();
  });

  isInitialized = true;
}

export function isDarkModeActive(): boolean {
  return document.documentElement.classList.contains(DARK_MODE_CLASS);
}

export function cleanupThemeManager(): void {
  log.debug('Cleaning up theme manager');
  if (themeCleanup) {
    themeCleanup();
    themeCleanup = null;
  }

  document.documentElement.classList.remove(DARK_MODE_CLASS);
  isInitialized = false;
}

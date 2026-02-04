import { getCurrentTheme, onThemeChange } from './theme';

const DARK_MODE_CLASS = 'n8n-xtend-dark';

let isInitialized = false;
let themeCleanup: (() => void) | null = null;

function updateDocumentTheme(): void {
  const isDark = getCurrentTheme() === 'dark';
  document.documentElement.classList.toggle(DARK_MODE_CLASS, isDark);
}

export function initThemeManager(): void {
  if (isInitialized) return;

  updateDocumentTheme();

  themeCleanup = onThemeChange(() => {
    updateDocumentTheme();
  });

  isInitialized = true;
}

export function isDarkModeActive(): boolean {
  return document.documentElement.classList.contains(DARK_MODE_CLASS);
}

export function cleanupThemeManager(): void {
  if (themeCleanup) {
    themeCleanup();
    themeCleanup = null;
  }

  document.documentElement.classList.remove(DARK_MODE_CLASS);
  isInitialized = false;
}

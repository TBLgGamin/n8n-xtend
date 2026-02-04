export { findElementByClassPattern, findElementBySelectors } from './dom';
export { escapeHtml } from './html';
export { logger } from './logger';
export { getBrowserId, getStorageItem, setStorageItem } from './storage';
export {
  getCurrentTheme,
  interceptLocalStorage,
  isDarkMode,
  onThemeChange,
  type Theme,
} from './theme';
export { getThemeColors, onThemeColorsChange, type ThemeColors } from './theme-colors';
export {
  cleanupThemeManager,
  initThemeManager,
  isDarkModeActive,
} from './theme-manager';
export {
  buildWorkflowUrl,
  getFolderIdFromUrl,
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  isN8nHost,
} from './url';

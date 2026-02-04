export { findElementByClassPattern, findElementBySelectors } from './dom';
export { escapeHtml } from './html';
export { logger } from './logger';
export {
  createAdaptivePollMonitor,
  createMutationMonitor,
  createPollMonitor,
  type AdaptivePollMonitor,
  type AdaptivePollMonitorConfig,
  type MutationMonitor,
  type MutationMonitorConfig,
  type PollMonitor,
  type PollMonitorConfig,
} from './monitor';
export {
  getBrowserId,
  getStorageItem,
  initStorage,
  isStorageReady,
  removeStorageItem,
  setStorageItem,
  waitForStorage,
} from './storage';
export { getCurrentTheme, isDarkMode, onThemeChange, type Theme } from './theme';
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

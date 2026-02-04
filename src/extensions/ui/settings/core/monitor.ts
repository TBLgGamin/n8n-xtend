import { logger } from '@/shared/utils';
import { injectSettingsPanel, removeSettingsPanel } from './injector';

const POLL_INTERVAL = 1000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let wasOnPage = false;
const log = logger.child('settings');

function isSettingsPersonalPage(): boolean {
  const path = location.pathname;
  return path === '/settings/personal' || path.startsWith('/settings/personal');
}

function checkAndInject(): void {
  const isOnPage = isSettingsPersonalPage();

  if (isOnPage && !wasOnPage) {
    log.debug('Entered settings page, attempting injection');
    const result = injectSettingsPanel();
    log.debug('Injection result:', result);
  } else if (!isOnPage && wasOnPage) {
    removeSettingsPanel();
  }

  wasOnPage = isOnPage;
}

export function startMonitor(): void {
  if (pollTimer) {
    return;
  }

  log.debug('Settings monitor started, current path:', location.pathname);
  wasOnPage = isSettingsPersonalPage();
  checkAndInject();
  pollTimer = setInterval(checkAndInject, POLL_INTERVAL);
}

export function stopMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  wasOnPage = false;
  removeSettingsPanel();
}

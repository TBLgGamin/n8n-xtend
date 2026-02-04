import { logger } from '@/shared/utils';
import { injectSettingsPanel, removeSettingsPanel } from './injector';

const POLL_INTERVAL = 500;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const log = logger.child('settings');

function isSettingsPersonalPage(): boolean {
  const path = location.pathname;
  return path === '/settings/personal' || path.startsWith('/settings/personal');
}

function checkAndInject(): void {
  const isPage = isSettingsPersonalPage();
  if (isPage) {
    log.debug('On settings page, attempting injection');
    const result = injectSettingsPanel();
    log.debug('Injection result:', result);
  } else {
    removeSettingsPanel();
  }
}

export function startMonitor(): void {
  if (pollTimer) {
    return;
  }

  log.debug('Settings monitor started, current path:', location.pathname);
  checkAndInject();
  pollTimer = setInterval(checkAndInject, POLL_INTERVAL);
}

export function stopMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  removeSettingsPanel();
}

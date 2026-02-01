import { logger } from '@/shared/utils';
import { enhanceUsageSyntax } from './enhancer';

const log = logger.child('variables');

const POLL_INTERVAL = 500;
const VARIABLES_PATH = '/variables';

let intervalId: ReturnType<typeof setInterval> | null = null;

function isVariablesPage(): boolean {
  return location.pathname.includes(VARIABLES_PATH);
}

function checkAndEnhance(): void {
  if (!isVariablesPage()) {
    return;
  }
  enhanceUsageSyntax();
}

export function startMonitor(): void {
  if (intervalId) {
    return;
  }

  log.info('Variables monitor started');
  intervalId = setInterval(checkAndEnhance, POLL_INTERVAL);
  checkAndEnhance();
}

export function stopMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

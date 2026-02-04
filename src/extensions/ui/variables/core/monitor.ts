import { type PollMonitor, createPollMonitor, logger } from '@/shared/utils';
import { enhanceUsageSyntax } from './enhancer';

const log = logger.child('variables');
const POLL_INTERVAL = 100;
const VARIABLES_PATH = '/variables';

function isVariablesPage(): boolean {
  return location.pathname.includes(VARIABLES_PATH);
}

function checkAndEnhance(): void {
  if (!isVariablesPage()) return;
  enhanceUsageSyntax();
}

const monitor: PollMonitor = createPollMonitor({
  interval: POLL_INTERVAL,
  check: checkAndEnhance,
  onStart: () => log.debug('Variables monitor started'),
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

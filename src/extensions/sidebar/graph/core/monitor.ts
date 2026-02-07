import { type PollMonitor, createPollMonitor, isAuthPage, logger } from '@/shared/utils';
import { checkNavigationChange, injectGraphMenuItem, removeGraphMenuItem } from './injector';

const log = logger.child('graph:monitor');

const POLL_INTERVAL = 500;

function checkAndInject(): void {
  if (isAuthPage()) {
    removeGraphMenuItem();
    return;
  }

  const sidebar = document.querySelector('#sidebar');
  if (!sidebar) {
    removeGraphMenuItem();
    return;
  }

  injectGraphMenuItem();
  checkNavigationChange();
}

const monitor: PollMonitor = createPollMonitor({
  interval: POLL_INTERVAL,
  check: checkAndInject,
  onStart: () => log.debug('Graph monitor started'),
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

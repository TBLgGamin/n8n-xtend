import {
  type PollMonitor,
  createPollMonitor,
  isSettingsPersonalPage,
  logger,
} from '@/shared/utils';
import { injectSettingsPanel, removeSettingsPanel } from './injector';

const log = logger.child('settings');
const POLL_INTERVAL = 100;

let wasOnPage = false;

function checkAndInject(): void {
  const isOnPage = isSettingsPersonalPage();

  if (isOnPage) {
    injectSettingsPanel();
  } else if (wasOnPage) {
    removeSettingsPanel();
  }

  wasOnPage = isOnPage;
}

const monitor: PollMonitor = createPollMonitor({
  interval: POLL_INTERVAL,
  check: checkAndInject,
  onStart: () => {
    log.debug('Settings monitor started, current path:', location.pathname);
  },
  onStop: () => {
    wasOnPage = false;
    removeSettingsPanel();
  },
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

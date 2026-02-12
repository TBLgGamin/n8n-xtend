import {
  type MutationMonitor,
  createMutationMonitor,
  isVariablesPage,
  logger,
} from '@/shared/utils';
import { enhanceUsageSyntax } from './enhancer';

const log = logger.child('variables');

function onMutation(): void {
  if (!isVariablesPage()) return;
  enhanceUsageSyntax();
}

const monitor: MutationMonitor = createMutationMonitor({
  onMutation,
  options: { childList: true, subtree: true, characterData: true },
  onStart: () => {
    log.debug('Variables monitor started');
    onMutation();
  },
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

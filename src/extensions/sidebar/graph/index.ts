import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('graph');

export const metadata: ExtensionMetadata = {
  id: 'graph',
  name: 'Graph',
  description: 'Adds a graph view to the sidebar for visualizing workflow dependencies',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing graph extension');
  startMonitor();
}

import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('graph');

export const metadata: ExtensionMetadata = {
  id: 'graph',
  name: 'Graph',
  description: 'Adds a graph view to the sidebar for visualizing workflow dependencies',
  howToUse:
    'Open any n8n project. A graph panel appears in the sidebar showing how your workflows relate to each other. Click a node to jump to that workflow. The layout auto-arranges based on trigger and dependency connections.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing graph extension');
  startMonitor();
}

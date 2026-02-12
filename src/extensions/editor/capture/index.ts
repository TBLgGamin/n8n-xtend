import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('capture');

export const metadata: ExtensionMetadata = {
  id: 'capture',
  name: 'Workflow Capture',
  description: 'Export workflow diagrams as PNG or SVG images',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing capture extension');
  startMonitor();
}

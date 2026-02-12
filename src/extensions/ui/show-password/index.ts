import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('show-password');

export const metadata: ExtensionMetadata = {
  id: 'show-password',
  name: 'Show Password',
  description: 'Adds toggle buttons to reveal password fields',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing show-password extension');
  startMonitor();
}

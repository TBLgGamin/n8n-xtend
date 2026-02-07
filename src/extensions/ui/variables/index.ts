import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('variables');

export const metadata: ExtensionMetadata = {
  id: 'variables',
  name: 'Variables Syntax',
  description: 'Enhances variable display with proper syntax highlighting',
  enabledByDefault: true,
};

export function initVariablesExtension(): void {
  log.info('Initializing variables extension');
  startMonitor();
}

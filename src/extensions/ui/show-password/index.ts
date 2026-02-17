import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('show-password');

export const metadata: ExtensionMetadata = {
  id: 'show-password',
  name: 'Show Password',
  description: 'Adds toggle buttons to reveal password fields',
  howToUse:
    'Navigate to any credential form or settings page that contains password fields. An eye icon appears at the right edge of each password input. Click it to reveal or hide the value. The toggle is keyboard-accessible via Tab and Enter.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing show-password extension');
  startMonitor();
}

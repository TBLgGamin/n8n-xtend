import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('variables');

export const metadata: ExtensionMetadata = {
  id: 'variables',
  name: 'Variables Syntax',
  description: 'Enhances variable display with proper syntax highlighting',
  howToUse:
    'Open the workflow editor and inspect any expression field. Variable tokens like {{ $json.field }} are rendered with syntax highlighting and a copy-on-click interaction. Click any token to copy its expression to the clipboard.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing variables extension');
  startMonitor();
}

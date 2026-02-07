import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('note-title');

export const metadata: ExtensionMetadata = {
  id: 'note-title',
  name: 'Note Title Rename',
  description: 'Rename sticky note visible titles with Space shortcut',
  enabledByDefault: true,
};

export function initNoteTitleExtension(): void {
  log.info('Initializing note-title extension');
  startMonitor();
}

import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('note-title');

export const metadata: ExtensionMetadata = {
  id: 'note-title',
  name: 'Note Title Rename',
  description: 'Rename sticky note visible titles with Space shortcut',
  howToUse:
    'Open any workflow that contains sticky notes. Click a sticky note to select it, then press Space to open the rename dialog. Type a new title and press Enter to confirm. The title appears above the note on the canvas.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing note-title extension');
  startMonitor();
}

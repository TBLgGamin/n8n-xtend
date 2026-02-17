import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('folder-tree');

export const metadata: ExtensionMetadata = {
  id: 'folder-tree',
  name: 'Folder Tree',
  description: 'Adds a collapsible folder tree to the sidebar for quick navigation',
  howToUse:
    'Open any n8n project. A collapsible folder tree appears in the left sidebar. Click folder names to expand or collapse them. Drag workflows onto folders to organize them. Folders can be nested — drag a workflow onto a subfolder to move it deeper.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing folder-tree extension');
  startMonitor();
}

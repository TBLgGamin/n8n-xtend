import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('folder-tree');

export const metadata: ExtensionMetadata = {
  id: 'folder-tree',
  name: 'Folder Tree',
  description: 'Adds a collapsible folder tree to the sidebar for quick navigation',
  enabledByDefault: true,
};

export function initFolderTreeExtension(): void {
  log.info('Initializing folder-tree extension');
  startMonitor();
}

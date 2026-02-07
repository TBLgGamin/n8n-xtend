import type { ExtensionMetadata } from '@/extensions/types';
import { startMonitor } from './core/monitor';

export const metadata: ExtensionMetadata = {
  id: 'folder-tree',
  name: 'Folder Tree',
  description: 'Adds a collapsible folder tree to the sidebar for quick navigation',
  enabledByDefault: true,
};

export function initFolderTreeExtension(): void {
  startMonitor();
}

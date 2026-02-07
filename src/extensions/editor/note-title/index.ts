import type { ExtensionMetadata } from '@/extensions/types';
import { startMonitor } from './core';

export const metadata: ExtensionMetadata = {
  id: 'note-title',
  name: 'Note Title Rename',
  description: 'Rename sticky note visible titles with Space shortcut',
  enabledByDefault: true,
};

export function initNoteTitleExtension(): void {
  startMonitor();
}

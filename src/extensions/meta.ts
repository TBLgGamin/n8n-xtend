import type { ExtensionMetadata } from './types';

export interface ExtensionMetaEntry extends ExtensionMetadata {
  group: string;
}

import { metadata as captureMetadata } from './editor/capture';
import { metadata as noteTitleMetadata } from './editor/note-title';
import { metadata as folderTreeMetadata } from './sidebar/folder-tree';
import { metadata as graphMetadata } from './sidebar/graph';
import { metadata as showPasswordMetadata } from './ui/show-password';
import { metadata as variablesMetadata } from './ui/variables';

export const extensionMeta: ExtensionMetaEntry[] = [
  { ...captureMetadata, group: 'editor' },
  { ...noteTitleMetadata, group: 'editor' },
  { ...folderTreeMetadata, group: 'sidebar' },
  { ...graphMetadata, group: 'sidebar' },
  { ...showPasswordMetadata, group: 'ui' },
  { ...variablesMetadata, group: 'ui' },
];

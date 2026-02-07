import type { ExtensionEntry } from './types';

import { metadata as captureMetadata, initCaptureExtension } from './editor/capture';
import { initNoteTitleExtension, metadata as noteTitleMetadata } from './editor/note-title';
import { metadata as folderTreeMetadata, initFolderTreeExtension } from './sidebar/folder-tree';
import { metadata as graphMetadata, initGraphExtension } from './sidebar/graph';
import { initShowPasswordExtension, metadata as showPasswordMetadata } from './ui/show-password';
import { initVariablesExtension, metadata as variablesMetadata } from './ui/variables';

export const extensionRegistry: ExtensionEntry[] = [
  { ...folderTreeMetadata, group: 'sidebar', init: initFolderTreeExtension },
  { ...graphMetadata, group: 'sidebar', init: initGraphExtension },
  { ...captureMetadata, group: 'editor', init: initCaptureExtension },
  { ...showPasswordMetadata, group: 'ui', init: initShowPasswordExtension },
  { ...variablesMetadata, group: 'ui', init: initVariablesExtension },
  { ...noteTitleMetadata, group: 'editor', init: initNoteTitleExtension },
];

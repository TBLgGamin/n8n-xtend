import type { ExtensionEntry } from './types';

import { init as captureInit, metadata as captureMetadata } from './editor/capture';
import { init as noteTitleInit, metadata as noteTitleMetadata } from './editor/note-title';
import { init as folderTreeInit, metadata as folderTreeMetadata } from './sidebar/folder-tree';
import { init as graphInit, metadata as graphMetadata } from './sidebar/graph';
import { init as showPasswordInit, metadata as showPasswordMetadata } from './ui/show-password';
import { init as variablesInit, metadata as variablesMetadata } from './ui/variables';

export const extensionRegistry: ExtensionEntry[] = [
  { ...captureMetadata, group: 'editor', init: captureInit },
  { ...noteTitleMetadata, group: 'editor', init: noteTitleInit },
  { ...folderTreeMetadata, group: 'sidebar', init: folderTreeInit },
  { ...graphMetadata, group: 'sidebar', init: graphInit },
  { ...showPasswordMetadata, group: 'ui', init: showPasswordInit },
  { ...variablesMetadata, group: 'ui', init: variablesInit },
];

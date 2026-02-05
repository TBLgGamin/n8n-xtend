import { getStorageItem, setStorageItem } from '@/shared/utils/storage';
import { createDebounced } from '@/shared/utils/timing';

const EXPANDED_FOLDERS_KEY = 'n8ntree-expanded';
const SAVE_DEBOUNCE_MS = 150;

type ExpandedFolders = Record<string, boolean>;

let cachedState: ExpandedFolders | null = null;

function getExpandedFolders(): ExpandedFolders {
  if (cachedState === null) {
    cachedState = getStorageItem<ExpandedFolders>(EXPANDED_FOLDERS_KEY) ?? {};
  }
  return cachedState;
}

const scheduleSave = createDebounced(() => {
  if (cachedState !== null) {
    setStorageItem(EXPANDED_FOLDERS_KEY, cachedState);
  }
}, SAVE_DEBOUNCE_MS);

export function isFolderExpanded(folderId: string): boolean {
  return getExpandedFolders()[folderId] === true;
}

export function setFolderExpanded(folderId: string, isExpanded: boolean): void {
  const expanded = getExpandedFolders();
  if (isExpanded) {
    expanded[folderId] = true;
  } else {
    delete expanded[folderId];
  }
  scheduleSave();
}

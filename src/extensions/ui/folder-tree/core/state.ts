import { getStorageItem, setStorageItem } from '@/shared/utils/storage';

const EXPANDED_FOLDERS_KEY = 'n8ntree-expanded';
const SAVE_DEBOUNCE_MS = 150;

type ExpandedFolders = Record<string, boolean>;

let cachedState: ExpandedFolders | null = null;
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getExpandedFolders(): ExpandedFolders {
  if (cachedState === null) {
    cachedState = getStorageItem<ExpandedFolders>(EXPANDED_FOLDERS_KEY) ?? {};
  }
  return cachedState;
}

function scheduleSave(): void {
  if (saveTimeoutId) clearTimeout(saveTimeoutId);
  saveTimeoutId = setTimeout(() => {
    if (cachedState !== null) {
      setStorageItem(EXPANDED_FOLDERS_KEY, cachedState);
    }
    saveTimeoutId = null;
  }, SAVE_DEBOUNCE_MS);
}

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

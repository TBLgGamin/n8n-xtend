import { getStorageItem, setStorageItem } from '@/shared/utils/storage';

const EXPANDED_FOLDERS_KEY = 'n8ntree-expanded';

type ExpandedFolders = Record<string, boolean>;

function getExpandedFolders(): ExpandedFolders {
  return getStorageItem<ExpandedFolders>(EXPANDED_FOLDERS_KEY) ?? {};
}

function saveExpandedFolders(expanded: ExpandedFolders): void {
  setStorageItem(EXPANDED_FOLDERS_KEY, expanded);
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
  saveExpandedFolders(expanded);
}

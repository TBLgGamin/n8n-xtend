const STORAGE_KEYS = {
  EXPANDED_FOLDERS: 'n8ntree-expanded',
  BROWSER_ID: 'n8n-browserId',
} as const;

type ExpandedFolders = Record<string, boolean>;

export function getExpandedFolders(): ExpandedFolders {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EXPANDED_FOLDERS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveExpandedFolders(expanded: ExpandedFolders): void {
  localStorage.setItem(STORAGE_KEYS.EXPANDED_FOLDERS, JSON.stringify(expanded));
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

export function isFolderExpanded(folderId: string): boolean {
  return getExpandedFolders()[folderId] === true;
}

export function getBrowserId(): string {
  return localStorage.getItem(STORAGE_KEYS.BROWSER_ID) ?? '';
}

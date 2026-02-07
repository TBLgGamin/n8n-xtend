import type { TreeItem } from '@/shared/types';
import { isFolder } from '@/shared/types';
import { logger } from '@/shared/utils';

const log = logger.child('folder-tree:sync');

export interface TreeDiff {
  added: TreeItem[];
  removed: string[];
  modified: TreeItem[];
}

function createItemKey(item: TreeItem): string {
  return `${item.resource || 'workflow'}:${item.id}`;
}

export function computeDiff(oldItems: TreeItem[], newItems: TreeItem[]): TreeDiff {
  const oldMap = new Map(oldItems.map((item) => [createItemKey(item), item]));
  const newMap = new Map(newItems.map((item) => [createItemKey(item), item]));

  const added: TreeItem[] = [];
  const removed: string[] = [];
  const modified: TreeItem[] = [];

  for (const [key, newItem] of newMap) {
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      added.push(newItem);
    } else if (hasItemChanged(oldItem, newItem)) {
      modified.push(newItem);
    }
  }

  for (const [key, oldItem] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(oldItem.id);
    }
  }

  return { added, removed, modified };
}

function hasItemChanged(oldItem: TreeItem, newItem: TreeItem): boolean {
  if (oldItem.name !== newItem.name) return true;
  if (oldItem.parentFolderId !== newItem.parentFolderId) return true;

  if (isFolder(oldItem) && isFolder(newItem)) {
    if (oldItem.workflowCount !== newItem.workflowCount) return true;
    if (oldItem.subFolderCount !== newItem.subFolderCount) return true;
  }

  return false;
}

export function hasDifferences(diff: TreeDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0;
}

export function logDiff(diff: TreeDiff, parentFolderId: string): void {
  if (!hasDifferences(diff)) return;

  log.debug(`Changes detected in folder ${parentFolderId}`, {
    added: diff.added.length,
    removed: diff.removed.length,
    modified: diff.modified.length,
  });
}

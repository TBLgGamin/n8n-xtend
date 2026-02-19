import { setSelection, toggleSelection } from '../core/dragdrop';

let lastClickedId: string | null = null;

function getAllSelectableIds(): string[] {
  const items = document.querySelectorAll<HTMLElement>('.n8n-xtend-folder-tree-item[data-item-id]');
  const ids: string[] = [];
  for (const item of items) {
    const id = item.dataset.itemId;
    if (id) ids.push(id);
  }
  return ids;
}

function selectRange(fromId: string, toId: string): void {
  const allIds = getAllSelectableIds();
  const fromIndex = allIds.indexOf(fromId);
  const toIndex = allIds.indexOf(toId);

  if (fromIndex === -1 || toIndex === -1) return;

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const rangeIds = allIds.slice(start, end + 1);

  setSelection(rangeIds);
}

export function handleItemClick(itemId: string, event: MouseEvent): void {
  if (event.shiftKey && lastClickedId) {
    selectRange(lastClickedId, itemId);
  } else if (event.ctrlKey || event.metaKey) {
    toggleSelection(itemId);
  }

  lastClickedId = itemId;
}

export function resetLastClicked(): void {
  lastClickedId = null;
}

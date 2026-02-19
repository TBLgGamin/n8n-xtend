import { emit, isValidId, logger, registerUndo, showToast } from '@/shared/utils';
import { copyFolder, copyWorkflow, moveFolder, moveWorkflow } from '../api';

const log = logger.child('folder-tree:dragdrop');

export type DragItemType = 'folder' | 'workflow';

export interface DragData {
  type: DragItemType;
  id: string;
  name: string;
  parentFolderId?: string;
}

let currentProjectId: string | null = null;
let onMoveComplete: (() => void) | null = null;

const setupDraggables = new WeakSet<HTMLElement>();

let highlightedElement: HTMLElement | null = null;
let dropZoneContainer: HTMLElement | null = null;
let dragEnterCount = 0;

export function setDragContext(projectId: string, refreshCallback: () => void): void {
  currentProjectId = projectId;
  onMoveComplete = refreshCallback;
}

function resolveDropTarget(target: HTMLElement): string {
  const folderItem = target.closest<HTMLElement>(
    '.n8n-xtend-folder-tree-node[data-folder-id] > .n8n-xtend-folder-tree-item',
  );
  if (folderItem) {
    const folderNode = folderItem.closest<HTMLElement>(
      '.n8n-xtend-folder-tree-node[data-folder-id]',
    );
    if (folderNode?.dataset.folderId) {
      return folderNode.dataset.folderId;
    }
  }

  const childrenArea = target.closest<HTMLElement>('.n8n-xtend-folder-tree-children');
  if (childrenArea) {
    const folderNode = childrenArea.closest<HTMLElement>(
      '.n8n-xtend-folder-tree-node[data-folder-id]',
    );
    if (folderNode?.dataset.folderId) {
      return folderNode.dataset.folderId;
    }
  }

  return '0';
}

function highlightTarget(folderId: string): void {
  const nextTarget =
    folderId === '0'
      ? dropZoneContainer
      : document.querySelector<HTMLElement>(
          `.n8n-xtend-folder-tree-node[data-folder-id="${folderId}"] > .n8n-xtend-folder-tree-item`,
        );

  if (nextTarget === highlightedElement) return;

  if (highlightedElement) {
    highlightedElement.classList.remove('n8n-xtend-folder-tree-drag-over');
  }

  if (nextTarget) {
    nextTarget.classList.add('n8n-xtend-folder-tree-drag-over');
    highlightedElement = nextTarget;
  } else {
    highlightedElement = null;
  }
}

function clearHighlight(): void {
  if (highlightedElement) {
    highlightedElement.classList.remove('n8n-xtend-folder-tree-drag-over');
    highlightedElement = null;
  }
}

function validateDragData(data: unknown): DragData | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'folder' && obj.type !== 'workflow') return null;
  if (typeof obj.id !== 'string' || !isValidId(obj.id)) return null;
  if (typeof obj.name !== 'string' || obj.name.length === 0) return null;

  if (obj.parentFolderId !== undefined) {
    if (typeof obj.parentFolderId !== 'string' || !isValidId(obj.parentFolderId)) return null;
  }

  return {
    type: obj.type,
    id: obj.id,
    name: obj.name,
    ...(typeof obj.parentFolderId === 'string' && { parentFolderId: obj.parentFolderId }),
  };
}

function parseDragData(jsonData: string | undefined): DragData | null {
  if (!jsonData) return null;
  try {
    return validateDragData(JSON.parse(jsonData));
  } catch (error) {
    log.debug('Failed to parse drag data', { error });
    return null;
  }
}

function parseMultiDragData(jsonData: string | undefined): DragData[] | null {
  if (!jsonData) return null;
  try {
    const parsed = JSON.parse(jsonData);
    if (!Array.isArray(parsed)) return null;
    const validated: DragData[] = [];
    for (const item of parsed) {
      const data = validateDragData(item);
      if (data) validated.push(data);
    }
    return validated.length > 0 ? validated : null;
  } catch {
    return null;
  }
}

async function handleMove(data: DragData, targetFolderId: string): Promise<boolean> {
  if (data.type === 'workflow') {
    return moveWorkflow(data.id, targetFolderId);
  }
  if (data.type === 'folder' && currentProjectId) {
    return moveFolder(currentProjectId, data.id, targetFolderId);
  }
  return false;
}

async function handleCopy(data: DragData, targetFolderId: string): Promise<boolean> {
  if (!currentProjectId) return false;

  if (data.type === 'workflow') {
    return copyWorkflow(data.id, targetFolderId, currentProjectId);
  }
  if (data.type === 'folder') {
    return copyFolder(currentProjectId, data.id, data.name, targetFolderId);
  }
  return false;
}

function resolveFolderName(folderId: string): string {
  if (folderId === '0') return 'root';
  const folderNode = document.querySelector<HTMLElement>(
    `.n8n-xtend-folder-tree-node[data-folder-id="${folderId}"] .n8n-xtend-folder-tree-label`,
  );
  return folderNode?.textContent || 'folder';
}

function registerMoveUndo(data: DragData, fromFolderId: string, toFolderId: string): void {
  if (!currentProjectId) return;

  const projectId = currentProjectId;
  const targetName = resolveFolderName(toFolderId);

  registerUndo({
    description: `Moved "${data.name}" to ${targetName}`,
    undo: async () => {
      const success =
        data.type === 'workflow'
          ? await moveWorkflow(data.id, fromFolderId)
          : await moveFolder(projectId, data.id, fromFolderId);

      if (success) {
        emit('folder-tree:item-moved', {
          type: data.type,
          id: data.id,
          name: data.name,
          fromFolderId: toFolderId,
          toFolderId: fromFolderId,
          projectId,
        });
        onMoveComplete?.();
      }
      return success;
    },
  });
}

function registerBatchMoveUndo(
  items: DragData[],
  fromFolderIds: string[],
  toFolderId: string,
): void {
  if (!currentProjectId) return;

  const projectId = currentProjectId;
  const targetName = resolveFolderName(toFolderId);

  registerUndo({
    description: `Moved ${items.length} items to ${targetName}`,
    undo: async () => {
      let allSuccess = true;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const fromId = fromFolderIds[i];
        if (!item || !fromId) continue;

        const success =
          item.type === 'workflow'
            ? await moveWorkflow(item.id, fromId)
            : await moveFolder(projectId, item.id, fromId);

        if (!success) allSuccess = false;
      }

      if (allSuccess) {
        onMoveComplete?.();
      }
      return allSuccess;
    },
  });
}

export function setupDraggable(
  element: HTMLElement,
  itemType: DragItemType,
  itemId: string,
  itemName: string,
  parentFolderId?: string,
): void {
  if (setupDraggables.has(element)) {
    return;
  }
  setupDraggables.add(element);

  element.setAttribute('draggable', 'true');
  element.dataset.itemType = itemType;
  element.dataset.itemId = itemId;

  element.addEventListener('dragstart', (event) => {
    if (!event.dataTransfer) return;

    const selectedDragData = getSelectedDragData();
    const isPartOfSelection = selectedDragData.some((s) => s.id === itemId);

    if (isPartOfSelection && selectedDragData.length > 1) {
      event.dataTransfer.setData('application/x-n8n-multi', JSON.stringify(selectedDragData));
      event.dataTransfer.effectAllowed = 'copyMove';

      for (const sel of selectedDragData) {
        const el = document.querySelector<HTMLElement>(
          `.n8n-xtend-folder-tree-item[data-item-id="${sel.id}"]`,
        );
        if (el) el.classList.add('n8n-xtend-folder-tree-dragging');
      }
    } else {
      const data: DragData = {
        type: itemType,
        id: itemId,
        name: itemName,
        ...(parentFolderId && { parentFolderId }),
      };
      event.dataTransfer.setData('application/json', JSON.stringify(data));
      event.dataTransfer.effectAllowed = 'copyMove';
      element.classList.add('n8n-xtend-folder-tree-dragging');
    }
  });

  element.addEventListener('dragend', () => {
    const dragging = document.querySelectorAll('.n8n-xtend-folder-tree-dragging');
    for (const el of dragging) {
      el.classList.remove('n8n-xtend-folder-tree-dragging');
    }
    clearHighlight();
  });
}

function shouldSkipDrop(data: DragData, normalizedTarget: string, isCopy: boolean): boolean {
  if (isCopy) return false;
  const normalizedParent = data.parentFolderId || '0';
  return data.id === normalizedTarget || normalizedParent === normalizedTarget;
}

function emitItemOperation(
  eventType: 'folder-tree:item-copied' | 'folder-tree:item-moved',
  data: DragData,
  fromFolderId: string,
  toFolderId: string,
): void {
  if (!currentProjectId) return;
  emit(eventType, {
    type: data.type,
    id: data.id,
    name: data.name,
    fromFolderId,
    toFolderId,
    projectId: currentProjectId,
  });
}

function handleDropSuccess(
  data: DragData,
  fromFolderId: string,
  normalizedTarget: string,
  targetName: string,
  isCopy: boolean,
): void {
  log.debug(`${isCopy ? 'Copy' : 'Move'} completed successfully`);
  const eventType = isCopy ? 'folder-tree:item-copied' : 'folder-tree:item-moved';
  emitItemOperation(eventType, data, fromFolderId, normalizedTarget);

  if (isCopy) {
    showToast({ message: `Copied "${data.name}" to ${targetName}` });
  } else {
    registerMoveUndo(data, fromFolderId, normalizedTarget);
  }

  onMoveComplete?.();
}

async function executeDrop(
  data: DragData,
  normalizedTarget: string,
  isCopy: boolean,
): Promise<void> {
  const fromFolderId = data.parentFolderId || '0';
  const targetName = resolveFolderName(normalizedTarget);

  const success = isCopy
    ? await handleCopy(data, normalizedTarget)
    : await handleMove(data, normalizedTarget);

  if (success) {
    handleDropSuccess(data, fromFolderId, normalizedTarget, targetName, isCopy);
  } else {
    showToast({ message: `Failed to ${isCopy ? 'copy' : 'move'} "${data.name}"` });
  }
}

function emitBatchOperation(
  eventType: 'folder-tree:items-copied' | 'folder-tree:items-moved',
  items: DragData[],
  fromFolderIds: string[],
  normalizedTarget: string,
): void {
  if (!currentProjectId) return;
  const operations = items.map((item, i) => ({
    type: item.type,
    id: item.id,
    name: item.name,
    fromFolderId: fromFolderIds[i] || '0',
    toFolderId: normalizedTarget,
    projectId: currentProjectId as string,
  }));
  emit(eventType, { operations });
}

async function executeMultiDrop(
  items: DragData[],
  normalizedTarget: string,
  isCopy: boolean,
): Promise<void> {
  const fromFolderIds = items.map((item) => item.parentFolderId || '0');
  const targetName = resolveFolderName(normalizedTarget);

  let successCount = 0;
  for (const item of items) {
    const success = isCopy
      ? await handleCopy(item, normalizedTarget)
      : await handleMove(item, normalizedTarget);
    if (success) successCount++;
  }

  if (successCount === 0) {
    showToast({ message: `Failed to ${isCopy ? 'copy' : 'move'} items` });
    return;
  }

  log.debug(`Batch ${isCopy ? 'copy' : 'move'} completed`, {
    successCount,
    totalCount: items.length,
  });
  const eventType = isCopy ? 'folder-tree:items-copied' : 'folder-tree:items-moved';
  emitBatchOperation(eventType, items, fromFolderIds, normalizedTarget);

  if (isCopy) {
    showToast({ message: `Copied ${successCount} items to ${targetName}` });
  } else {
    registerBatchMoveUndo(items, fromFolderIds, normalizedTarget);
  }

  clearSelection();
  onMoveComplete?.();
}

async function processDrop(event: DragEvent, targetFolderId: string): Promise<void> {
  const isCopy = event.ctrlKey || event.metaKey;

  const multiData = parseMultiDragData(event.dataTransfer?.getData('application/x-n8n-multi'));
  if (multiData) {
    const validItems = multiData.filter((item) => !shouldSkipDrop(item, targetFolderId, isCopy));

    if (validItems.length > 0) {
      log.debug(`Batch ${isCopy ? 'copy' : 'move'}: ${validItems.length} items`);
      await executeMultiDrop(validItems, targetFolderId, isCopy);
    }
    return;
  }

  const data = parseDragData(event.dataTransfer?.getData('application/json'));
  if (!data) {
    log.debug('No valid drag data found');
    return;
  }

  if (shouldSkipDrop(data, targetFolderId, isCopy)) {
    log.debug('Skipping no-op move', { itemId: data.id, targetFolderId });
    return;
  }

  log.debug(`${isCopy ? 'Copying' : 'Moving'} ${data.type}`, {
    itemId: data.id,
    itemName: data.name,
    fromFolder: data.parentFolderId || 'root',
    toFolder: targetFolderId === '0' ? 'root' : targetFolderId,
  });
  await executeDrop(data, targetFolderId, isCopy);
}

export function setupDropZone(container: HTMLElement): void {
  if (dropZoneContainer === container) return;
  dropZoneContainer = container;
  dragEnterCount = 0;

  container.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragEnterCount++;
  });

  container.addEventListener('dragover', (event) => {
    event.preventDefault();
    const isCopy = event.ctrlKey || event.metaKey;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
    }
    const targetId = resolveDropTarget(event.target as HTMLElement);
    highlightTarget(targetId);
  });

  container.addEventListener('dragleave', () => {
    dragEnterCount--;
    if (dragEnterCount <= 0) {
      dragEnterCount = 0;
      clearHighlight();
    }
  });

  container.addEventListener('drop', async (event) => {
    event.preventDefault();
    dragEnterCount = 0;
    clearHighlight();
    const targetId = resolveDropTarget(event.target as HTMLElement);
    await processDrop(event, targetId);
  });
}

const selectedItems = new Set<string>();

export function isItemSelected(itemId: string): boolean {
  return selectedItems.has(itemId);
}

export function toggleSelection(itemId: string): void {
  if (selectedItems.has(itemId)) {
    selectedItems.delete(itemId);
  } else {
    selectedItems.add(itemId);
  }

  updateSelectionVisuals();
  emitSelectionChanged();
}

export function addToSelection(itemId: string): void {
  selectedItems.add(itemId);
  updateSelectionVisuals();
  emitSelectionChanged();
}

export function setSelection(itemIds: string[]): void {
  selectedItems.clear();
  for (const id of itemIds) {
    selectedItems.add(id);
  }
  updateSelectionVisuals();
  emitSelectionChanged();
}

export function clearSelection(): void {
  if (selectedItems.size === 0) return;
  selectedItems.clear();
  updateSelectionVisuals();
  emitSelectionChanged();
}

export function getSelectedIds(): string[] {
  return Array.from(selectedItems);
}

function getSelectedDragData(): DragData[] {
  const result: DragData[] = [];
  for (const itemId of selectedItems) {
    const el = document.querySelector<HTMLElement>(
      `.n8n-xtend-folder-tree-item[data-item-id="${itemId}"]`,
    );
    if (!el) continue;

    const type = el.dataset.itemType as DragItemType | undefined;
    const name =
      el.closest('.n8n-xtend-folder-tree-node')?.querySelector('.n8n-xtend-folder-tree-label')
        ?.textContent ?? '';
    if (!type || !name) continue;

    const parentNode = el.closest('.n8n-xtend-folder-tree-children');
    const parentFolderNode = parentNode?.closest<HTMLElement>('.n8n-xtend-folder-tree-node');
    const parentFolderId = parentFolderNode?.dataset.folderId;

    const data: DragData = { type, id: itemId, name };
    if (parentFolderId) data.parentFolderId = parentFolderId;
    result.push(data);
  }
  return result;
}

function updateSelectionVisuals(): void {
  const allItems = document.querySelectorAll<HTMLElement>('.n8n-xtend-folder-tree-item');
  for (const item of allItems) {
    const itemId = item.dataset.itemId;
    if (itemId && selectedItems.has(itemId)) {
      item.classList.add('n8n-xtend-folder-tree-selected');
    } else {
      item.classList.remove('n8n-xtend-folder-tree-selected');
    }
  }
}

function emitSelectionChanged(): void {
  const items = getSelectedDragData();
  emit('folder-tree:selection-changed', { items });
}

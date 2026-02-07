import { isValidId, logger } from '@/shared/utils';
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

const setupDropTargets = new WeakSet<HTMLElement>();
const setupDraggables = new WeakSet<HTMLElement>();

let pendingUpdates: Array<{ element: Element; add: string[]; remove: string[] }> = [];
let rafId: number | null = null;

function scheduleDomUpdate(element: Element, add: string[] = [], remove: string[] = []): void {
  pendingUpdates.push({ element, add, remove });

  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      for (const update of pendingUpdates) {
        if (update.remove.length > 0) {
          update.element.classList.remove(...update.remove);
        }
        if (update.add.length > 0) {
          update.element.classList.add(...update.add);
        }
      }
      pendingUpdates = [];
      rafId = null;
    });
  }
}

export function setDragContext(projectId: string, refreshCallback: () => void): void {
  currentProjectId = projectId;
  onMoveComplete = refreshCallback;
}

function clearDropTargetClasses(): void {
  const elements = document.querySelectorAll('.n8n-xtend-folder-tree-drag-over');
  for (const el of elements) {
    scheduleDomUpdate(el, [], ['n8n-xtend-folder-tree-drag-over']);
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

    const data: DragData = {
      type: itemType,
      id: itemId,
      name: itemName,
      ...(parentFolderId && { parentFolderId }),
    };

    event.dataTransfer.setData('application/json', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copyMove';
    element.classList.add('n8n-xtend-folder-tree-dragging');
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('n8n-xtend-folder-tree-dragging');
    clearDropTargetClasses();
  });
}

function shouldSkipDrop(
  data: DragData,
  folderId: string,
  normalizedParent: string,
  normalizedTarget: string,
  isCopy: boolean,
): boolean {
  if (isCopy) return false;
  return data.id === folderId || normalizedParent === normalizedTarget;
}

function logDropOperation(data: DragData, normalizedTarget: string, isCopy: boolean): void {
  log.debug(`${isCopy ? 'Copying' : 'Moving'} ${data.type}`, {
    itemId: data.id,
    itemName: data.name,
    fromFolder: data.parentFolderId || 'root',
    toFolder: normalizedTarget === '0' ? 'root' : normalizedTarget,
  });
}

async function executeDrop(
  data: DragData,
  normalizedTarget: string,
  isCopy: boolean,
): Promise<void> {
  const success = isCopy
    ? await handleCopy(data, normalizedTarget)
    : await handleMove(data, normalizedTarget);

  if (success) {
    log.debug(`${isCopy ? 'Copy' : 'Move'} completed successfully`);
    onMoveComplete?.();
  } else {
    log.debug(`${isCopy ? 'Copy' : 'Move'} failed`);
  }
}

async function processDrop(event: DragEvent, folderId: string, isRoot: boolean): Promise<void> {
  const data = parseDragData(event.dataTransfer?.getData('application/json'));
  if (!data) {
    log.debug('No valid drag data found');
    return;
  }

  const normalizedParent = data.parentFolderId || '0';
  const normalizedTarget = isRoot ? '0' : folderId;
  const isCopy = event.ctrlKey || event.metaKey;

  if (shouldSkipDrop(data, folderId, normalizedParent, normalizedTarget, isCopy)) {
    log.debug('Skipping no-op move', { itemId: data.id, targetFolderId: normalizedTarget });
    return;
  }

  logDropOperation(data, normalizedTarget, isCopy);
  await executeDrop(data, normalizedTarget, isCopy);
}

export function setupDropTarget(element: HTMLElement, folderId: string, isRoot = false): void {
  if (setupDropTargets.has(element)) {
    return;
  }
  setupDropTargets.add(element);

  element.classList.add('n8n-xtend-folder-tree-drop-target');
  element.dataset.folderId = folderId;

  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isCopy = event.ctrlKey || event.metaKey;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
    }
    element.classList.add('n8n-xtend-folder-tree-drag-over');
  });

  element.addEventListener('dragleave', (event) => {
    event.stopPropagation();
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !element.contains(relatedTarget)) {
      element.classList.remove('n8n-xtend-folder-tree-drag-over');
    }
  });

  element.addEventListener('drop', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove('n8n-xtend-folder-tree-drag-over');
    await processDrop(event, folderId, isRoot);
  });
}

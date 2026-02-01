import { logger } from '@/shared/utils';
import { moveFolder, moveWorkflow } from '../api';

const log = logger.child('dragdrop');

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

export function setDragContext(projectId: string, refreshCallback: () => void): void {
  currentProjectId = projectId;
  onMoveComplete = refreshCallback;
}

function clearDropTargetClasses(): void {
  for (const el of document.querySelectorAll('.n8n-tree-can-drop')) {
    el.classList.remove('n8n-tree-can-drop');
  }
  for (const el of document.querySelectorAll('.n8n-tree-drag-over')) {
    el.classList.remove('n8n-tree-drag-over');
  }
}

function highlightDropTargets(element: HTMLElement, itemId: string): void {
  for (const el of document.querySelectorAll<HTMLElement>('.n8n-tree-drop-target')) {
    if (el !== element && el.dataset.itemId !== itemId) {
      el.classList.add('n8n-tree-can-drop');
    }
  }
}

function parseDragData(jsonData: string | undefined): DragData | null {
  if (!jsonData) return null;
  try {
    return JSON.parse(jsonData) as DragData;
  } catch {
    return null;
  }
}

async function handleDrop(data: DragData, targetFolderId: string): Promise<boolean> {
  if (data.type === 'workflow') {
    return moveWorkflow(data.id, targetFolderId);
  }
  if (data.type === 'folder' && currentProjectId) {
    return moveFolder(currentProjectId, data.id, targetFolderId);
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
      parentFolderId,
    };

    event.dataTransfer.setData('application/json', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
    element.classList.add('n8n-tree-dragging');

    requestAnimationFrame(() => highlightDropTargets(element, itemId));
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('n8n-tree-dragging');
    clearDropTargetClasses();
  });
}

export function setupDropTarget(element: HTMLElement, folderId: string, isRoot = false): void {
  if (setupDropTargets.has(element)) {
    return;
  }
  setupDropTargets.add(element);

  element.classList.add('n8n-tree-drop-target');
  element.dataset.folderId = folderId;

  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    element.classList.add('n8n-tree-drag-over');
  });

  element.addEventListener('dragleave', (event) => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !element.contains(relatedTarget)) {
      element.classList.remove('n8n-tree-drag-over');
    }
  });

  element.addEventListener('drop', async (event) => {
    event.preventDefault();
    element.classList.remove('n8n-tree-drag-over');

    const data = parseDragData(event.dataTransfer?.getData('application/json'));
    if (!data) return;

    const normalizedParent = data.parentFolderId || '0';
    const normalizedTarget = isRoot ? '0' : folderId;
    if (data.id === folderId || normalizedParent === normalizedTarget) return;

    log.debug('Dropping item', { data, targetFolderId: normalizedTarget });

    const success = await handleDrop(data, normalizedTarget);

    if (success) {
      log.info(`Moved ${data.type} "${data.name}" to folder`);
      onMoveComplete?.();
    }
  });
}

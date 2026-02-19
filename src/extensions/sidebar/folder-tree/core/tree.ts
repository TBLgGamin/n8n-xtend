import { type Folder, type TreeItem, type Workflow, isFolder } from '@/shared/types';
import { emit, logger } from '@/shared/utils';

const log = logger.child('folder-tree');
import { getFolderIdFromUrl } from '@/shared/utils/url';
import { clearFolderCache, fetchFolderPath, fetchFolders, fetchFoldersFresh } from '../api';
import { createFolderElement, createWorkflowElement } from '../components';
import { setDragContext, setupDropZone } from './dragdrop';
import { setFolderExpanded } from './state';
import { type TreeDiff, computeDiff, hasDifferences, logDiff } from './sync';

interface TreeState {
  projectId: string;
  rootContainer: HTMLElement;
  currentItems: Map<string, TreeItem[]>;
}

let treeState: TreeState | null = null;

export function partitionItems(items: TreeItem[]): { folders: Folder[]; workflows: Workflow[] } {
  const folders: Folder[] = [];
  const workflows: Workflow[] = [];

  for (const item of items) {
    if (isFolder(item)) {
      folders.push(item);
    } else {
      workflows.push(item);
    }
  }

  return { folders, workflows };
}

function findChildrenContainer(parentFolderId: string): HTMLElement | null {
  if (parentFolderId === '0' && treeState) {
    return treeState.rootContainer;
  }

  const folderNode = document.querySelector<HTMLElement>(
    `.n8n-xtend-folder-tree-node[data-folder-id="${parentFolderId}"]`,
  );
  if (!folderNode) return null;

  return folderNode.querySelector<HTMLElement>('.n8n-xtend-folder-tree-children');
}

function removeItemById(container: HTMLElement, itemId: string): void {
  const workflowItem = container.querySelector(
    `.n8n-xtend-folder-tree-workflow-item[data-workflow-id="${itemId}"]`,
  );

  if (workflowItem) {
    workflowItem.remove();
    return;
  }

  const folderNode = container.querySelector(
    `.n8n-xtend-folder-tree-node[data-folder-id="${itemId}"]`,
  );

  if (folderNode) {
    folderNode.remove();
  }
}

function updateItem(container: HTMLElement, item: TreeItem, projectId: string): void {
  const itemId = item.id;

  if (isFolder(item)) {
    const folderNode = container.querySelector(
      `.n8n-xtend-folder-tree-node[data-folder-id="${itemId}"]`,
    );
    if (folderNode) {
      folderNode.replaceWith(createFolderElement(item, projectId));
    }
  } else {
    const workflowItem = container.querySelector(
      `.n8n-xtend-folder-tree-workflow-item[data-workflow-id="${itemId}"]`,
    );
    if (workflowItem) {
      workflowItem.replaceWith(createWorkflowElement(item));
    }
  }
}

function addNewItems(
  container: HTMLElement,
  newWorkflows: Workflow[],
  newFolders: Folder[],
  projectId: string,
): void {
  const fragment = document.createDocumentFragment();

  for (const workflow of newWorkflows) {
    fragment.appendChild(createWorkflowElement(workflow));
  }

  const firstFolder = container.querySelector('.n8n-xtend-folder-tree-node');
  if (firstFolder) {
    firstFolder.before(fragment);
  } else {
    container.appendChild(fragment);
  }

  const folderFragment = document.createDocumentFragment();
  for (const folder of newFolders) {
    folderFragment.appendChild(createFolderElement(folder, projectId));
  }
  container.appendChild(folderFragment);
}

function applyDiffToContainer(container: HTMLElement, diff: TreeDiff, projectId: string): void {
  for (const itemId of diff.removed) {
    removeItemById(container, itemId);
  }

  for (const item of diff.modified) {
    updateItem(container, item, projectId);
  }

  const { folders: newFolders, workflows: newWorkflows } = partitionItems(diff.added);
  addNewItems(container, newWorkflows, newFolders, projectId);
}

export async function syncFolderContents(projectId: string, parentFolderId: string): Promise<void> {
  if (!treeState || treeState.projectId !== projectId) return;

  const container = findChildrenContainer(parentFolderId);
  if (!container) return;

  try {
    const oldItems = treeState.currentItems.get(parentFolderId) || [];
    const newItems = await fetchFoldersFresh(projectId, parentFolderId);

    const diff = computeDiff(oldItems, newItems);

    if (hasDifferences(diff)) {
      logDiff(diff, parentFolderId);
      applyDiffToContainer(container, diff, projectId);
      treeState.currentItems.set(parentFolderId, newItems);
      emit('folder-tree:tree-refreshed', { projectId });
    }
  } catch (error) {
    log.debug('Failed to sync folder contents', { parentFolderId, error });
  }
}

export async function loadTree(container: HTMLElement, projectId: string): Promise<void> {
  container.innerHTML = '';
  clearFolderCache();

  treeState = {
    projectId,
    rootContainer: container,
    currentItems: new Map(),
  };

  const currentFolderId = getFolderIdFromUrl();
  if (currentFolderId) {
    const path = await fetchFolderPath(currentFolderId);
    for (const folderId of path) {
      setFolderExpanded(folderId, true);
    }
  }

  const refresh = () => loadTree(container, projectId);
  setDragContext(projectId, refresh);

  try {
    const items = await fetchFolders(projectId, '0');
    treeState.currentItems.set('0', items);

    const { folders, workflows } = partitionItems(items);

    if (folders.length === 0 && workflows.length === 0) {
      container.textContent = '';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const workflow of workflows) {
      fragment.appendChild(createWorkflowElement(workflow));
    }

    for (const folder of folders) {
      fragment.appendChild(createFolderElement(folder, projectId));
    }

    container.textContent = '';
    container.appendChild(fragment);

    setupDropZone(container);
    emit('folder-tree:tree-loaded', { projectId });
  } catch (error) {
    log.debug('Failed to load folder tree', error);
    container.innerHTML =
      '<div class="n8n-xtend-folder-tree-empty n8n-xtend-folder-tree-error">Failed to load</div>';
  }
}

export function getTreeState(): TreeState | null {
  return treeState;
}

export function clearTreeState(): void {
  treeState = null;
}

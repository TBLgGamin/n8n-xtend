import { isFolder } from '@/shared/types';
import { logger } from '@/shared/utils';

const log = logger.child('tree');
import { getFolderIdFromUrl } from '@/shared/utils/url';
import { fetchFolderPath, fetchFolders } from '../api';
import { createFolderElement, createWorkflowElement } from '../components';
import { setDragContext, setupDropTarget } from './dragdrop';
import { initKeyboardNavigation, resetKeyboardFocus } from './keyboard';
import { setFolderExpanded } from './state';

let cleanupKeyboard: (() => void) | null = null;

function createSkeletonLoader(): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = 'n8n-tree-loading';
  skeleton.innerHTML = `
    <div class="n8n-tree-skeleton">
      <div class="n8n-tree-skeleton-chevron"></div>
      <div class="n8n-tree-skeleton-icon"></div>
      <div class="n8n-tree-skeleton-text"></div>
    </div>
    <div class="n8n-tree-skeleton">
      <div class="n8n-tree-skeleton-chevron"></div>
      <div class="n8n-tree-skeleton-icon"></div>
      <div class="n8n-tree-skeleton-text"></div>
    </div>
    <div class="n8n-tree-skeleton">
      <div class="n8n-tree-skeleton-chevron"></div>
      <div class="n8n-tree-skeleton-icon"></div>
      <div class="n8n-tree-skeleton-text"></div>
    </div>
  `;
  return skeleton;
}

export async function loadTree(container: HTMLElement, projectId: string): Promise<void> {
  container.innerHTML = '';
  container.appendChild(createSkeletonLoader());

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

    const folders = items.filter(isFolder);
    const workflows = items.filter((i) => !isFolder(i));

    if (folders.length === 0 && workflows.length === 0) {
      container.innerHTML = '';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const workflow of workflows) {
      fragment.appendChild(createWorkflowElement(workflow));
    }

    for (const folder of folders) {
      fragment.appendChild(createFolderElement(folder, projectId));
    }

    container.innerHTML = '';
    container.appendChild(fragment);

    setupDropTarget(container, '0', true);

    const treeView = container.closest('#n8n-tree-view');
    if (treeView) {
      cleanupKeyboard?.();
      resetKeyboardFocus();
      cleanupKeyboard = initKeyboardNavigation(treeView as HTMLElement);
    }
  } catch (error) {
    log.error('Failed to load tree', error);
    container.innerHTML = '<div class="n8n-tree-empty n8n-tree-error">Failed to load</div>';
  }
}

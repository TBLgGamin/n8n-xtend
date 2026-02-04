import { type Folder, type Workflow, isFolder } from '@/shared/types';
import { logger } from '@/shared/utils';

const log = logger.child('folder-tree');
import { getFolderIdFromUrl } from '@/shared/utils/url';
import { fetchFolderPath, fetchFolders } from '../api';
import { createFolderElement, createWorkflowElement } from '../components';
import { setDragContext, setupDropTarget } from './dragdrop';
import { initKeyboardNavigation, resetKeyboardFocus } from './keyboard';
import { setFolderExpanded } from './state';

let cleanupKeyboard: (() => void) | null = null;

export async function loadTree(container: HTMLElement, projectId: string): Promise<void> {
  container.innerHTML = '';

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

    const folders: Folder[] = [];
    const workflows: Workflow[] = [];

    for (const item of items) {
      if (isFolder(item)) {
        folders.push(item);
      } else {
        workflows.push(item);
      }
    }

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

    setupDropTarget(container, '0', true);

    const folderTree = container.closest('#n8n-xtend-folder-tree');
    if (folderTree) {
      cleanupKeyboard?.();
      resetKeyboardFocus();
      cleanupKeyboard = initKeyboardNavigation(folderTree as HTMLElement);
    }
  } catch (error) {
    log.debug('Failed to load folder tree', error);
    container.innerHTML =
      '<div class="n8n-xtend-folder-tree-empty n8n-xtend-folder-tree-error">Failed to load</div>';
  }
}

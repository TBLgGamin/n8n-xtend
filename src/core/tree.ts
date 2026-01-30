import { fetchFolders, fetchFolderPath } from '../api/client';
import { createFolderElement } from '../components/folder';
import { createWorkflowElement } from '../components/workflow';
import { isFolder } from '../types';
import { logger } from '../utils/logger';
import { setFolderExpanded } from '../utils/storage';
import { getFolderIdFromUrl } from '../utils/url';

export async function loadTree(
  container: HTMLElement,
  projectId: string
): Promise<void> {
  const currentFolderId = getFolderIdFromUrl();
  if (currentFolderId) {
    const path = await fetchFolderPath(currentFolderId);
    path.forEach((folderId) => setFolderExpanded(folderId, true));
  }

  try {
    const items = await fetchFolders(projectId, '0');

    const folders = items.filter(isFolder);
    const workflows = items.filter((i) => !isFolder(i));

    if (folders.length === 0 && workflows.length === 0) {
      container.innerHTML = '';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const folder of folders) {
      fragment.appendChild(createFolderElement(folder, projectId));
    }

    for (const workflow of workflows) {
      fragment.appendChild(createWorkflowElement(workflow));
    }

    container.innerHTML = '';
    container.appendChild(fragment);
  } catch (error) {
    logger.error('Failed to load tree', error);
    container.innerHTML =
      '<div class="n8n-tree-empty n8n-tree-error">Failed to load</div>';
  }
}

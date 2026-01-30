import { fetchFolders } from '../api/client';
import { createFolderElement } from '../components/folder';
import { createWorkflowElement } from '../components/workflow';
import { isFolder } from '../types';
import { logger } from '../utils/logger';

export async function loadTree(
  container: HTMLElement,
  projectId: string
): Promise<void> {

  try {
    const items = await fetchFolders(projectId, '0');
    container.innerHTML = '';

    const folders = items.filter(isFolder);
    const workflows = items.filter((i) => !isFolder(i));

    if (folders.length === 0 && workflows.length === 0) {
      return;
    }

    folders.forEach((folder) => {
      container.appendChild(createFolderElement(folder, projectId));
    });

    workflows.forEach((workflow) => {
      container.appendChild(createWorkflowElement(workflow));
    });
  } catch (error) {
    logger.error('Failed to load tree', error);
    container.innerHTML =
      '<div class="n8n-tree-empty n8n-tree-error">Failed to load</div>';
  }
}

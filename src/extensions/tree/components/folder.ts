import { type Folder, isFolder } from '@/shared/types';
import { getFolderIdFromUrl } from '@/shared/utils';
import { fetchFolders } from '../api';
import { setupDraggable, setupDropTarget } from '../core/dragdrop';
import { isFolderExpanded, setFolderExpanded } from '../core/state';
import { icons } from '../icons';
import { createWorkflowElement } from './workflow';

export function createFolderElement(folder: Folder, projectId: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-tree-node';
  node.dataset.folderId = folder.id;

  const count = (folder.workflowCount ?? 0) + (folder.subFolderCount ?? 0);
  const isActive = getFolderIdFromUrl() === folder.id;
  const folderUrl = `${location.origin}/projects/${projectId}/folders/${folder.id}/workflows`;

  node.innerHTML = `
    <div class="n8n-tree-item${isActive ? ' active' : ''}">
      <span class="n8n-tree-chevron collapsed">${icons.chevron}</span>
      <a href="${folderUrl}" class="n8n-tree-folder-link" title="${escapeHtml(folder.name)}">
        <span class="n8n-tree-icon folder">${icons.folder}</span>
        <span class="n8n-tree-label">${escapeHtml(folder.name)}</span>
      </a>
      ${count ? `<span class="n8n-tree-count">${count}</span>` : ''}
    </div>
    <div class="n8n-tree-children collapsed"></div>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-tree-item');
  const chevron = node.querySelector<HTMLElement>('.n8n-tree-chevron');
  const icon = node.querySelector<HTMLElement>('.n8n-tree-icon');
  const children = node.querySelector<HTMLElement>('.n8n-tree-children');

  if (!item || !chevron || !icon || !children) {
    return node;
  }

  setupDraggable(item, 'folder', folder.id, folder.name, folder.parentFolderId);
  setupDropTarget(item, folder.id);

  const childrenEl = children;
  const chevronEl = chevron;
  const iconEl = icon;

  let loaded = false;
  let open = false;

  async function expand(): Promise<void> {
    if (!loaded) {
      loaded = true;

      try {
        const items = await fetchFolders(projectId, folder.id);
        const fragment = document.createDocumentFragment();

        const folders = items.filter(isFolder);
        const workflows = items.filter((i) => !isFolder(i));

        for (const workflow of workflows) {
          fragment.appendChild(createWorkflowElement(workflow));
        }

        for (const folder of folders) {
          fragment.appendChild(createFolderElement(folder, projectId));
        }

        childrenEl.innerHTML = '';
        childrenEl.appendChild(fragment);
      } catch {
        childrenEl.innerHTML = '<div class="n8n-tree-empty n8n-tree-error">Error</div>';
        loaded = false;
      }
    }

    open = true;
    childrenEl.classList.remove('collapsed');
    chevronEl.classList.remove('collapsed');
    iconEl.innerHTML = icons.folderOpen;
    setFolderExpanded(folder.id, true);
  }

  function collapse(): void {
    open = false;
    childrenEl.classList.add('collapsed');
    chevronEl.classList.add('collapsed');
    iconEl.innerHTML = icons.folder;
    setFolderExpanded(folder.id, false);
  }

  async function toggle(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!open) {
      await expand();
    } else {
      collapse();
    }
  }

  chevron.onclick = toggle;

  if (isFolderExpanded(folder.id)) {
    requestAnimationFrame(() => expand());
  }

  return node;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

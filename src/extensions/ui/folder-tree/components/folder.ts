import { type Folder, type TreeItem, type Workflow, isFolder } from '@/shared/types';
import { buildFolderUrl, escapeHtml, getFolderIdFromUrl, isValidId } from '@/shared/utils';
import { fetchFolders } from '../api';
import { invalidateItemsCache, setupDraggable, setupDropTarget } from '../core';
import { isFolderExpanded, setFolderExpanded } from '../core/state';
import { icons } from '../icons';
import { createWorkflowElement } from './workflow';

function partitionItems(items: TreeItem[]): { folders: Folder[]; workflows: Workflow[] } {
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

export function createFolderElement(folder: Folder, projectId: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-xtend-folder-tree-node';
  node.dataset.folderId = folder.id;

  if (!isValidId(folder.id) || !isValidId(projectId)) {
    node.innerHTML = '<div class="n8n-xtend-folder-tree-error">Invalid folder</div>';
    return node;
  }

  const count = (folder.workflowCount ?? 0) + (folder.subFolderCount ?? 0);
  const isActive = getFolderIdFromUrl() === folder.id;
  const folderUrl = buildFolderUrl(projectId, folder.id);

  node.innerHTML = `
    <div class="n8n-xtend-folder-tree-item${isActive ? ' active' : ''}">
      <span class="n8n-xtend-folder-tree-chevron collapsed">${icons.chevron}</span>
      <a href="${escapeHtml(folderUrl)}" class="n8n-xtend-folder-tree-folder-link" title="${escapeHtml(folder.name)}">
        <span class="n8n-xtend-folder-tree-icon folder">${icons.folder}</span>
        <span class="n8n-xtend-folder-tree-label">${escapeHtml(folder.name)}</span>
      </a>
      ${count ? `<span class="n8n-xtend-folder-tree-count">${count}</span>` : ''}
    </div>
    <div class="n8n-xtend-folder-tree-children collapsed"></div>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-xtend-folder-tree-item');
  const chevron = node.querySelector<HTMLElement>('.n8n-xtend-folder-tree-chevron');
  const icon = node.querySelector<HTMLElement>('.n8n-xtend-folder-tree-icon');
  const children = node.querySelector<HTMLElement>('.n8n-xtend-folder-tree-children');

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

  async function loadChildren(): Promise<boolean> {
    try {
      const items = await fetchFolders(projectId, folder.id);
      const { folders, workflows } = partitionItems(items);
      const fragment = document.createDocumentFragment();

      for (const workflow of workflows) {
        fragment.appendChild(createWorkflowElement(workflow));
      }

      for (const subFolder of folders) {
        fragment.appendChild(createFolderElement(subFolder, projectId));
      }

      childrenEl.textContent = '';
      childrenEl.appendChild(fragment);
      return true;
    } catch {
      childrenEl.innerHTML =
        '<div class="n8n-xtend-folder-tree-empty n8n-xtend-folder-tree-error">Error</div>';
      return false;
    }
  }

  async function expand(): Promise<void> {
    if (!loaded) {
      loaded = true;
      const success = await loadChildren();
      if (!success) {
        loaded = false;
      }
    }

    open = true;
    childrenEl.classList.remove('collapsed');
    chevronEl.classList.remove('collapsed');
    iconEl.innerHTML = icons.folderOpen;
    setFolderExpanded(folder.id, true);
    invalidateItemsCache();
  }

  function collapse(): void {
    open = false;
    childrenEl.classList.add('collapsed');
    chevronEl.classList.add('collapsed');
    iconEl.innerHTML = icons.folder;
    setFolderExpanded(folder.id, false);
    invalidateItemsCache();
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

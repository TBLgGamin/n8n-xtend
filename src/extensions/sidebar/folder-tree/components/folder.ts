import type { Folder } from '@/shared/types';
import { buildFolderUrl, escapeHtml, getFolderIdFromUrl, isValidId, logger } from '@/shared/utils';
import { fetchFolders } from '../api';
import { setupDraggable, setupDropTarget } from '../core';
import { isFolderExpanded, setFolderExpanded } from '../core/state';
import { getTreeState, partitionItems } from '../core/tree';
import { icons } from '../icons';
import { createWorkflowElement } from './workflow';

const log = logger.child('folder-tree:components:folder');

export function createFolderElement(folder: Folder, projectId: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-xtend-folder-tree-node';
  node.dataset.folderId = folder.id;

  if (!isValidId(folder.id) || !isValidId(projectId)) {
    node.innerHTML = '<div class="n8n-xtend-folder-tree-error">Invalid folder</div>';
    return node;
  }

  const rawCount = (folder.workflowCount ?? 0) + (folder.subFolderCount ?? 0);
  const count = typeof rawCount === 'number' && Number.isFinite(rawCount) ? rawCount : 0;
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

  let isLoaded = false;
  let isOpen = false;

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

      const state = getTreeState();
      if (state) {
        state.currentItems.set(folder.id, items);
      }

      return true;
    } catch (error) {
      log.debug('Failed to load folder children', { folderId: folder.id, error });
      childrenEl.innerHTML =
        '<div class="n8n-xtend-folder-tree-empty n8n-xtend-folder-tree-error">Error</div>';
      return false;
    }
  }

  async function expand(): Promise<void> {
    if (!isLoaded) {
      isLoaded = true;
      const success = await loadChildren();
      if (!success) {
        isLoaded = false;
      }
    }

    isOpen = true;
    childrenEl.classList.remove('collapsed');
    chevronEl.classList.remove('collapsed');
    iconEl.innerHTML = icons.folderOpen;
    setFolderExpanded(folder.id, true);
  }

  function collapse(): void {
    isOpen = false;
    childrenEl.classList.add('collapsed');
    chevronEl.classList.add('collapsed');
    iconEl.innerHTML = icons.folder;
    setFolderExpanded(folder.id, false);
  }

  async function toggle(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!isOpen) {
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

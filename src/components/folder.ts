import { icons } from '../icons';
import { fetchFolders } from '../api/client';
import { isFolderExpanded, setFolderExpanded } from '../utils/storage';
import { createWorkflowElement } from './workflow';
import { isFolder, type Folder } from '../types';

export function createFolderElement(
  folder: Folder,
  projectId: string
): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-tree-node';

  const count = (folder.workflowCount ?? 0) + (folder.subFolderCount ?? 0);

  node.innerHTML = `
    <div class="n8n-tree-item">
      <span class="n8n-tree-chevron collapsed">${icons.chevron}</span>
      <span class="n8n-tree-icon folder">${icons.folder}</span>
      <span class="n8n-tree-label">${escapeHtml(folder.name)}</span>
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

  let loaded = false;
  let open = false;

  async function expand(): Promise<void> {
    if (!loaded) {
      loaded = true;

      try {
        const items = await fetchFolders(projectId, folder.id);
        children!.innerHTML = '';

        const folders = items.filter(isFolder);
        const workflows = items.filter((i) => !isFolder(i));

        folders.forEach((sub) => {
          children!.appendChild(createFolderElement(sub, projectId));
        });

        workflows.forEach((w) => {
          children!.appendChild(createWorkflowElement(w));
        });
      } catch {
        children!.innerHTML =
          '<div class="n8n-tree-empty n8n-tree-error">Error</div>';
        loaded = false;
      }
    }

    open = true;
    children!.classList.remove('collapsed');
    chevron!.classList.remove('collapsed');
    icon!.innerHTML = icons.folderOpen;
    setFolderExpanded(folder.id, true);
  }

  function collapse(): void {
    open = false;
    children!.classList.add('collapsed');
    chevron!.classList.add('collapsed');
    icon!.innerHTML = icons.folder;
    setFolderExpanded(folder.id, false);
  }

  item.onclick = async (event) => {
    event.stopPropagation();
    if (!open) {
      await expand();
    } else {
      collapse();
    }
  };

  if (isFolderExpanded(folder.id)) {
    setTimeout(() => expand(), 10);
  }

  return node;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

import type { TreeItemType } from '@/shared/types';
import {
  buildFolderUrl,
  buildWorkflowUrl,
  escapeHtml,
  isValidId,
  logger,
  showToast,
} from '@/shared/utils';
import {
  clearFolderCache,
  copyFolder,
  copyWorkflow,
  deleteFolder,
  deleteWorkflow,
  renameFolder,
  renameWorkflow,
} from '../api';
import { getTreeState, loadTree } from './tree';

const log = logger.child('folder-tree:contextmenu');

const MENU_CLASS = 'n8n-xtend-folder-tree-context-menu';
const MENU_ITEM_CLASS = 'n8n-xtend-folder-tree-context-menu-item';
const MENU_SEPARATOR_CLASS = 'n8n-xtend-folder-tree-context-menu-separator';
const MENU_ITEM_DANGER_CLASS = 'n8n-xtend-folder-tree-context-menu-item-danger';

interface ContextTarget {
  type: TreeItemType;
  id: string;
  name: string;
  parentFolderId: string;
  projectId: string;
}

let activeMenu: HTMLElement | null = null;
let dismissHandler: ((e: Event) => void) | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function dismiss(): void {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
  if (dismissHandler) {
    document.removeEventListener('click', dismissHandler, true);
    dismissHandler = null;
  }
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
  }
}

function resolveTarget(element: HTMLElement): ContextTarget | null {
  const itemEl = element.closest<HTMLElement>('.n8n-xtend-folder-tree-item');
  if (!itemEl) return null;

  const type = itemEl.dataset.itemType as TreeItemType | undefined;
  const id = itemEl.dataset.itemId;
  if (!type || !id || !isValidId(id)) return null;

  const state = getTreeState();
  if (!state) return null;

  const name =
    itemEl.closest('.n8n-xtend-folder-tree-node')?.querySelector('.n8n-xtend-folder-tree-label')
      ?.textContent ?? '';

  const childrenContainer = itemEl.closest('.n8n-xtend-folder-tree-children');
  const parentNode = childrenContainer?.closest<HTMLElement>('.n8n-xtend-folder-tree-node');
  const parentFolderId = parentNode?.dataset.folderId ?? '0';

  return { type, id, name, parentFolderId, projectId: state.projectId };
}

function refreshTree(): void {
  const state = getTreeState();
  if (state) {
    loadTree(state.rootContainer, state.projectId);
  }
}

async function handleRename(target: ContextTarget): Promise<void> {
  const newName = prompt(`Rename ${target.type}`, target.name);
  if (!newName || newName === target.name) return;

  const success =
    target.type === 'folder'
      ? await renameFolder(target.projectId, target.id, newName)
      : await renameWorkflow(target.id, newName);

  if (success) {
    showToast({ message: `Renamed to "${newName}"` });
    refreshTree();
  } else {
    showToast({ message: `Failed to rename ${target.type}` });
  }
}

async function handleDuplicate(target: ContextTarget): Promise<void> {
  const copyName = `${target.name} (copy)`;

  const success =
    target.type === 'folder'
      ? await copyFolder(target.projectId, target.id, copyName, target.parentFolderId)
      : await copyWorkflow(target.id, target.parentFolderId, target.projectId);

  if (success) {
    showToast({ message: `Duplicated "${target.name}"` });
    clearFolderCache();
    refreshTree();
  } else {
    showToast({ message: `Failed to duplicate ${target.type}` });
  }
}

async function handleDelete(target: ContextTarget): Promise<void> {
  const confirmed = confirm(
    `Delete ${target.type} "${target.name}"?\n\n${target.type === 'folder' ? 'All contents will be deleted.' : 'This cannot be undone.'}`,
  );
  if (!confirmed) return;

  const success =
    target.type === 'folder'
      ? await deleteFolder(target.projectId, target.id)
      : await deleteWorkflow(target.id);

  if (success) {
    showToast({ message: `Deleted "${target.name}"` });
    refreshTree();
  } else {
    showToast({ message: `Failed to delete ${target.type}` });
  }
}

function handleCopyLink(target: ContextTarget): void {
  const url =
    target.type === 'folder'
      ? buildFolderUrl(target.projectId, target.id)
      : buildWorkflowUrl(target.id);

  navigator.clipboard.writeText(url).then(
    () => showToast({ message: 'Link copied' }),
    () => showToast({ message: 'Failed to copy link' }),
  );
}

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

function buildMenuItems(target: ContextTarget): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'Rename', action: () => handleRename(target) },
    { label: 'Duplicate', action: () => handleDuplicate(target) },
    { label: 'Copy link', action: () => handleCopyLink(target) },
    { label: 'Delete', action: () => handleDelete(target), danger: true },
  ];

  return items;
}

function positionMenu(menu: HTMLElement, x: number, y: number): void {
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  });
}

function createMenuElement(items: MenuItem[]): HTMLElement {
  const menu = document.createElement('div');
  menu.className = MENU_CLASS;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    if (item.danger && i > 0) {
      const separator = document.createElement('div');
      separator.className = MENU_SEPARATOR_CLASS;
      menu.appendChild(separator);
    }

    const button = document.createElement('button');
    button.className = item.danger
      ? `${MENU_ITEM_CLASS} ${MENU_ITEM_DANGER_CLASS}`
      : MENU_ITEM_CLASS;
    button.textContent = item.label;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
      item.action();
    });
    menu.appendChild(button);
  }

  return menu;
}

export function showContextMenu(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  dismiss();

  const target = resolveTarget(event.target as HTMLElement);
  if (!target) return;

  const items = buildMenuItems(target);
  const menu = createMenuElement(items);
  document.body.appendChild(menu);
  activeMenu = menu;

  positionMenu(menu, event.clientX, event.clientY);

  dismissHandler = (e: Event) => {
    if (!menu.contains(e.target as Node)) {
      dismiss();
    }
  };

  keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss();
    }
  };

  const currentDismissHandler = dismissHandler;
  const currentKeyHandler = keyHandler;
  requestAnimationFrame(() => {
    if (currentDismissHandler) {
      document.addEventListener('click', currentDismissHandler, true);
    }
    if (currentKeyHandler) {
      document.addEventListener('keydown', currentKeyHandler, true);
    }
  });
}

export function cleanupContextMenu(): void {
  dismiss();
}

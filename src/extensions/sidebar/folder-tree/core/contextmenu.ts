import type { TreeItemType } from '@/shared/types';
import { buildFolderUrl, buildWorkflowUrl, escapeHtml, isValidId, showToast } from '@/shared/utils';
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

const MENU_CLASS = 'n8n-xtend-folder-tree-context-menu';
const MENU_ITEM_CLASS = 'n8n-xtend-folder-tree-context-menu-item';
const MENU_SEPARATOR_CLASS = 'n8n-xtend-folder-tree-context-menu-separator';
const MENU_ITEM_DANGER_CLASS = 'n8n-xtend-folder-tree-context-menu-item-danger';

const CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>';

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

function showRenameDialog(type: TreeItemType, currentName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position: fixed; inset: 0; z-index: 2100; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5);';

    const messageBox = document.createElement('div');
    messageBox.className = 'el-message-box rename-prompt';
    messageBox.tabIndex = -1;

    const header = document.createElement('div');
    header.className = 'el-message-box__header';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'el-message-box__title';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `Rename ${type}`;
    titleDiv.appendChild(titleSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'el-message-box__headerbtn';
    closeBtn.setAttribute('aria-label', 'Close this dialog');
    closeBtn.innerHTML = `<i class="el-icon el-message-box__close">${CLOSE_ICON}</i>`;

    header.appendChild(titleDiv);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'el-message-box__content';

    const container = document.createElement('div');
    container.className = 'el-message-box__container';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'el-message-box__message';

    const labelEl = document.createElement('label');
    labelEl.textContent = 'New name:';
    messageDiv.appendChild(labelEl);
    container.appendChild(messageDiv);

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'el-message-box__input';

    const elInput = document.createElement('div');
    elInput.className = 'el-input';

    const elInputWrapper = document.createElement('div');
    elInputWrapper.className = 'el-input__wrapper';
    elInputWrapper.tabIndex = -1;

    const input = document.createElement('input');
    input.className = 'el-input__inner';
    input.type = 'text';
    input.autocomplete = 'off';
    input.tabIndex = 0;
    input.value = currentName;

    elInputWrapper.appendChild(input);
    elInput.appendChild(elInputWrapper);

    const errMsg = document.createElement('div');
    errMsg.className = 'el-message-box__errormsg';
    errMsg.style.visibility = 'hidden';

    inputWrapper.appendChild(elInput);
    inputWrapper.appendChild(errMsg);

    content.appendChild(container);
    content.appendChild(inputWrapper);

    const btns = document.createElement('div');
    btns.className = 'el-message-box__btns';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'el-button btn--cancel';
    const cancelSpan = document.createElement('span');
    cancelSpan.textContent = 'Cancel';
    cancelBtn.appendChild(cancelSpan);

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'el-button el-button--primary btn--confirm';
    const renameSpan = document.createElement('span');
    renameSpan.textContent = 'Rename';
    renameBtn.appendChild(renameSpan);

    btns.appendChild(cancelBtn);
    btns.appendChild(renameBtn);

    messageBox.appendChild(header);
    messageBox.appendChild(content);
    messageBox.appendChild(btns);
    overlay.appendChild(messageBox);

    let resolved = false;
    const close = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };

    const confirm = () => {
      const newName = input.value.trim();
      close(newName && newName !== currentName ? newName : null);
    };

    closeBtn.onclick = () => close(null);
    cancelBtn.onclick = () => close(null);
    renameBtn.onclick = confirm;
    overlay.onclick = (e) => e.target === overlay && close(null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(null);
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        confirm();
      }
    };
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

function showDeleteDialog(type: TreeItemType, name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position: fixed; inset: 0; z-index: 2100; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5);';

    const messageBox = document.createElement('div');
    messageBox.className = 'el-message-box';
    messageBox.tabIndex = -1;

    const header = document.createElement('div');
    header.className = 'el-message-box__header';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'el-message-box__title';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `Delete ${type}`;
    titleDiv.appendChild(titleSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'el-message-box__headerbtn';
    closeBtn.setAttribute('aria-label', 'Close this dialog');
    closeBtn.innerHTML = `<i class="el-icon el-message-box__close">${CLOSE_ICON}</i>`;

    header.appendChild(titleDiv);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'el-message-box__content';

    const container = document.createElement('div');
    container.className = 'el-message-box__container';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'el-message-box__message';

    const nameEl = document.createElement('p');
    nameEl.style.cssText = 'margin: 0 0 8px 0; font-weight: 500;';
    nameEl.textContent = name;

    const warningEl = document.createElement('p');
    warningEl.style.cssText = 'margin: 0;';
    warningEl.textContent =
      type === 'folder' ? 'All contents will be deleted.' : 'This cannot be undone.';

    messageDiv.appendChild(nameEl);
    messageDiv.appendChild(warningEl);
    container.appendChild(messageDiv);
    content.appendChild(container);

    const btns = document.createElement('div');
    btns.className = 'el-message-box__btns';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'el-button btn--cancel';
    const cancelSpan = document.createElement('span');
    cancelSpan.textContent = 'Cancel';
    cancelBtn.appendChild(cancelSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'el-button el-button--primary btn--confirm';
    const deleteSpan = document.createElement('span');
    deleteSpan.textContent = 'Delete';
    deleteBtn.appendChild(deleteSpan);

    btns.appendChild(cancelBtn);
    btns.appendChild(deleteBtn);

    messageBox.appendChild(header);
    messageBox.appendChild(content);
    messageBox.appendChild(btns);
    overlay.appendChild(messageBox);

    let resolved = false;
    const close = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };

    closeBtn.onclick = () => close(false);
    cancelBtn.onclick = () => close(false);
    deleteBtn.onclick = () => close(true);
    overlay.onclick = (e) => e.target === overlay && close(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(overlay);
    cancelBtn.focus();
  });
}

async function handleRename(target: ContextTarget): Promise<void> {
  const newName = await showRenameDialog(target.type, target.name);
  if (!newName) return;

  const success =
    target.type === 'folder'
      ? await renameFolder(target.projectId, target.id, newName)
      : await renameWorkflow(target.id, newName);

  if (success) {
    showToast({ message: `Renamed to "${escapeHtml(newName)}"` });
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
    showToast({ message: `Duplicated "${escapeHtml(target.name)}"` });
    clearFolderCache();
    refreshTree();
  } else {
    showToast({ message: `Failed to duplicate ${target.type}` });
  }
}

async function handleDelete(target: ContextTarget): Promise<void> {
  const confirmed = await showDeleteDialog(target.type, target.name);
  if (!confirmed) return;

  const success =
    target.type === 'folder'
      ? await deleteFolder(target.projectId, target.id)
      : await deleteWorkflow(target.id);

  if (success) {
    showToast({ message: `Deleted "${escapeHtml(target.name)}"` });
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

export interface ContextMenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
}

let activeMenu: HTMLElement | null = null;

function closeMenu(): void {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
  document.removeEventListener('click', closeMenu);
  document.removeEventListener('contextmenu', closeMenu);
}

export function showContextMenu(event: MouseEvent, items: ContextMenuItem[]): void {
  event.preventDefault();
  event.stopPropagation();
  closeMenu();

  const menu = document.createElement('div');
  menu.className = 'n8n-tree-context-menu';

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'n8n-tree-context-menu-separator';
      menu.appendChild(sep);
    }

    const menuItem = document.createElement('div');
    menuItem.className = 'n8n-tree-context-menu-item';
    menuItem.textContent = item.label;
    menuItem.onclick = (e) => {
      e.stopPropagation();
      closeMenu();
      item.action();
    };
    menu.appendChild(menuItem);
  }

  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;

  document.body.appendChild(menu);
  activeMenu = menu;

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 8}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  }

  requestAnimationFrame(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  });
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

const FOCUSABLE_SELECTOR = '.n8n-xtend-folder-tree-item';

let currentFocusIndex = -1;

function getVisibleItems(container: HTMLElement): HTMLElement[] {
  const nodeList = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const items: HTMLElement[] = [];

  for (const el of nodeList) {
    if (el.offsetParent !== null) {
      items.push(el);
    }
  }

  return items;
}

function setFocusedItem(container: HTMLElement, index: number): void {
  const items = getVisibleItems(container);
  if (items.length === 0) return;

  const previouslyFocused = container.querySelector('.n8n-xtend-folder-tree-focused');
  if (previouslyFocused) {
    previouslyFocused.classList.remove('n8n-xtend-folder-tree-focused');
  }

  currentFocusIndex = Math.max(0, Math.min(index, items.length - 1));
  const item = items[currentFocusIndex];
  if (item) {
    item.classList.add('n8n-xtend-folder-tree-focused');
    item.scrollIntoView({ block: 'nearest' });
  }
}

function navigateToItem(items: HTMLElement[]): void {
  const focusedItem = items[currentFocusIndex];
  if (!focusedItem) return;

  const link =
    focusedItem.tagName === 'A'
      ? (focusedItem as HTMLAnchorElement)
      : focusedItem.querySelector<HTMLAnchorElement>('.n8n-xtend-folder-tree-folder-link');

  if (link?.href) {
    window.location.href = link.href;
  }
}

function toggleFocusedItem(items: HTMLElement[]): void {
  const focusedItem = items[currentFocusIndex];
  if (!focusedItem) return;

  const chevron = focusedItem.querySelector<HTMLElement>('.n8n-xtend-folder-tree-chevron');
  chevron?.click();
}

function expandFocusedItem(items: HTMLElement[]): void {
  const focusedItem = items[currentFocusIndex];
  if (!focusedItem) return;

  const node = focusedItem.closest('.n8n-xtend-folder-tree-node');
  const children = node?.querySelector('.n8n-xtend-folder-tree-children');
  const chevron = focusedItem.querySelector<HTMLElement>('.n8n-xtend-folder-tree-chevron');

  if (chevron && children?.classList.contains('collapsed')) {
    chevron.click();
  }
}

function collapseFocusedItem(container: HTMLElement, items: HTMLElement[]): void {
  const focusedItem = items[currentFocusIndex];
  if (!focusedItem) return;

  const node = focusedItem.closest('.n8n-xtend-folder-tree-node');
  const children = node?.querySelector('.n8n-xtend-folder-tree-children');
  const chevron = focusedItem.querySelector<HTMLElement>('.n8n-xtend-folder-tree-chevron');

  if (chevron && children && !children.classList.contains('collapsed')) {
    chevron.click();
    return;
  }

  const parentNode = node?.parentElement?.closest('.n8n-xtend-folder-tree-node');
  if (!parentNode) return;

  const parentItem = parentNode.querySelector<HTMLElement>('.n8n-xtend-folder-tree-item');
  if (!parentItem) return;

  const parentIndex = items.indexOf(parentItem);
  if (parentIndex >= 0) {
    setFocusedItem(container, parentIndex);
  }
}

type KeyHandler = (container: HTMLElement, items: HTMLElement[]) => void;

const keyHandlers: Record<string, KeyHandler> = {
  ArrowDown: (container, _items) => setFocusedItem(container, currentFocusIndex + 1),
  ArrowUp: (container, _items) => setFocusedItem(container, currentFocusIndex - 1),
  Enter: (_container, items) => navigateToItem(items),
  ' ': (_container, items) => toggleFocusedItem(items),
  ArrowRight: (_container, items) => expandFocusedItem(items),
  ArrowLeft: (container, items) => collapseFocusedItem(container, items),
  Home: (container, _items) => setFocusedItem(container, 0),
  End: (container, items) => setFocusedItem(container, items.length - 1),
};

function handleKeyDown(container: HTMLElement, event: KeyboardEvent): void {
  const items = getVisibleItems(container);
  if (items.length === 0) return;

  const handler = keyHandlers[event.key];
  if (handler) {
    event.preventDefault();
    handler(container, items);
  }
}

export function initKeyboardNavigation(container: HTMLElement): () => void {
  const content = container.querySelector<HTMLElement>('#n8n-xtend-folder-tree-content');
  if (!content) return () => {};

  content.setAttribute('tabindex', '0');
  content.setAttribute('role', 'tree');

  const keyHandler = (event: KeyboardEvent) => handleKeyDown(content, event);
  const focusHandler = () => {
    if (currentFocusIndex < 0) {
      setFocusedItem(content, 0);
    }
  };
  const blurHandler = () => {
    const focused = content.querySelector('.n8n-xtend-folder-tree-focused');
    if (focused) {
      focused.classList.remove('n8n-xtend-folder-tree-focused');
    }
  };

  content.addEventListener('keydown', keyHandler);
  content.addEventListener('focus', focusHandler);
  content.addEventListener('blur', blurHandler);

  return () => {
    content.removeEventListener('keydown', keyHandler);
    content.removeEventListener('focus', focusHandler);
    content.removeEventListener('blur', blurHandler);
  };
}

export function resetKeyboardFocus(): void {
  currentFocusIndex = -1;
}

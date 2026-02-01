import { logger } from '@/shared/utils';
import { loadTree } from './tree';

const TREE_CONTAINER_ID = 'n8n-tree-view';
const TREE_CONTENT_ID = 'n8n-tree-content';

const SIDEBAR_SELECTORS = {
  sidebar: '#sidebar',
  sideMenu: ['_sideMenu_', '_projects_', '_menuContent_'],
  bottomMenu: ['_bottomMenu_', '_menuFooter_'],
} as const;

function findElementByClassPattern(parent: Element, patterns: readonly string[]): Element | null {
  const elements = parent.querySelectorAll('*');

  for (const element of elements) {
    const className = element.className;
    if (typeof className !== 'string') continue;

    for (const pattern of patterns) {
      if (className.includes(pattern)) {
        logger.debug('Found element matching pattern', pattern);
        return element;
      }
    }
  }

  return null;
}

function createTreeContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = TREE_CONTAINER_ID;
  container.innerHTML = `
    <div class="tree-header">Folders</div>
    <div id="${TREE_CONTENT_ID}"></div>
  `;
  return container;
}

export function inject(projectId: string): boolean {
  logger.debug('Injecting tree view for project', projectId);

  if (document.getElementById(TREE_CONTAINER_ID)) {
    logger.debug('Tree already exists');
    return true;
  }

  if (!projectId) {
    logger.debug('No project ID provided');
    return true;
  }

  const sidebar = document.querySelector(SIDEBAR_SELECTORS.sidebar);
  if (!sidebar) {
    logger.debug('Sidebar not found');
    return false;
  }

  const sideMenu = findElementByClassPattern(sidebar, SIDEBAR_SELECTORS.sideMenu);
  if (!sideMenu) {
    logger.debug('Side menu element not found');
    return false;
  }

  const container = createTreeContainer();

  const bottomMenu = findElementByClassPattern(sideMenu, SIDEBAR_SELECTORS.bottomMenu);

  if (bottomMenu?.parentElement) {
    bottomMenu.parentElement.insertBefore(container, bottomMenu);
    logger.debug('Inserted before bottom menu');
  } else {
    sideMenu.appendChild(container);
    logger.debug('Appended to side menu');
  }

  const content = document.getElementById(TREE_CONTENT_ID);
  if (content) {
    loadTree(content, projectId);
    return true;
  }

  return false;
}

export function removeTree(): void {
  const existing = document.getElementById(TREE_CONTAINER_ID);
  if (existing) {
    existing.remove();
    logger.debug('Tree removed');
  }
}

export function tryInject(projectId: string, maxRetries = 10, delay = 300): void {
  let retries = maxRetries;

  function attempt(): void {
    if (retries <= 0) {
      logger.warn('Injection failed after max retries');
      return;
    }

    const success = inject(projectId);
    if (!success) {
      retries--;
      logger.debug('Injection failed, retrying', { retriesLeft: retries });
      setTimeout(attempt, delay);
    }
  }

  attempt();
}

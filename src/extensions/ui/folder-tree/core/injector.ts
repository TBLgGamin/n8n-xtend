import { findElementByClassPattern, logger } from '@/shared/utils';
import { loadTree } from './tree';

const log = logger.child('folder-tree:injector');

const CONTAINER_ID = 'n8n-xtend-folder-tree';
const CONTENT_ID = 'n8n-xtend-folder-tree-content';
const COLLAPSED_WIDTH_THRESHOLD = 100;

const SIDEBAR_SELECTORS = {
  sidebar: '#sidebar',
  sideMenu: ['_sideMenu_', '_projects_', '_menuContent_'],
  bottomMenu: ['_bottomMenu_', '_menuFooter_'],
} as const;

let sidebarResizeObserver: ResizeObserver | null = null;

function updateVisibility(sidebar: Element): void {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const isCollapsed = sidebar.clientWidth < COLLAPSED_WIDTH_THRESHOLD;
  container.classList.toggle('hidden', isCollapsed);
}

function setupResizeObserver(sidebar: Element): void {
  if (sidebarResizeObserver) {
    sidebarResizeObserver.disconnect();
  }

  let rafId: number | null = null;

  sidebarResizeObserver = new ResizeObserver(() => {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      updateVisibility(sidebar);
      rafId = null;
    });
  });

  sidebarResizeObserver.observe(sidebar);
  updateVisibility(sidebar);
}

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.innerHTML = `
    <div class="n8n-xtend-folder-tree-header">Folders</div>
    <div id="${CONTENT_ID}"></div>
  `;
  return container;
}

export function injectFolderTree(projectId: string): boolean {
  log.debug('Injecting folder tree for project', projectId);

  if (document.getElementById(CONTAINER_ID)) {
    log.debug('Folder tree already exists');
    return true;
  }

  if (!projectId) {
    log.debug('No project ID provided');
    return true;
  }

  const sidebar = document.querySelector(SIDEBAR_SELECTORS.sidebar);
  if (!sidebar) {
    log.debug('Sidebar not found');
    return false;
  }

  const sideMenu = findElementByClassPattern(sidebar, SIDEBAR_SELECTORS.sideMenu);
  if (!sideMenu) {
    log.debug('Side menu element not found');
    return false;
  }

  const container = createContainer();

  const bottomMenu = findElementByClassPattern(sideMenu, SIDEBAR_SELECTORS.bottomMenu);

  if (bottomMenu?.parentElement) {
    bottomMenu.parentElement.insertBefore(container, bottomMenu);
    log.debug('Inserted before bottom menu');
  } else {
    sideMenu.appendChild(container);
    log.debug('Appended to side menu');
  }

  const content = document.getElementById(CONTENT_ID);
  if (content) {
    setupResizeObserver(sidebar);
    loadTree(content, projectId);
    return true;
  }

  return false;
}

export function removeFolderTree(): void {
  if (sidebarResizeObserver) {
    sidebarResizeObserver.disconnect();
    sidebarResizeObserver = null;
  }

  const existing = document.getElementById(CONTAINER_ID);
  if (existing) {
    existing.remove();
    log.debug('Folder tree removed');
  }
}

export function tryInject(projectId: string, maxRetries = 10, delay = 300): void {
  let retries = maxRetries;

  function attempt(): void {
    if (retries <= 0) {
      log.debug('Injection failed after max retries');
      return;
    }

    const success = injectFolderTree(projectId);
    if (!success) {
      retries--;
      log.debug('Injection failed, retrying', { retriesLeft: retries });
      setTimeout(attempt, delay);
    }
  }

  attempt();
}

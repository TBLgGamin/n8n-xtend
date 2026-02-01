import { getCurrentTheme, logger, onThemeChange } from '@/shared/utils';
import { loadTree } from './tree';

const log = logger.child('injector');

const TREE_CONTAINER_ID = 'n8n-tree-view';
const TREE_CONTENT_ID = 'n8n-tree-content';
const COLLAPSED_WIDTH_THRESHOLD = 100;
const DARK_MODE_CLASS = 'n8n-tree-dark';

const SIDEBAR_SELECTORS = {
  sidebar: '#sidebar',
  sideMenu: ['_sideMenu_', '_projects_', '_menuContent_'],
  bottomMenu: ['_bottomMenu_', '_menuFooter_'],
} as const;

let sidebarResizeObserver: ResizeObserver | null = null;
let themeCleanup: (() => void) | null = null;

function updateTheme(): void {
  const container = document.getElementById(TREE_CONTAINER_ID);
  if (!container) return;

  const isDark = getCurrentTheme() === 'dark';
  container.classList.toggle(DARK_MODE_CLASS, isDark);
}

function updateTreeVisibility(sidebar: Element): void {
  const container = document.getElementById(TREE_CONTAINER_ID);
  if (!container) return;

  const isCollapsed = sidebar.clientWidth < COLLAPSED_WIDTH_THRESHOLD;
  container.classList.toggle('hidden', isCollapsed);
}

function setupResizeObserver(sidebar: Element): void {
  if (sidebarResizeObserver) {
    sidebarResizeObserver.disconnect();
  }

  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  sidebarResizeObserver = new ResizeObserver(() => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateTreeVisibility(sidebar);
    }, 16);
  });

  sidebarResizeObserver.observe(sidebar);
  updateTreeVisibility(sidebar);
}

function findElementByClassPattern(parent: Element, patterns: readonly string[]): Element | null {
  const selector = patterns.map((pattern) => `[class*="${pattern}"]`).join(',');
  const element = parent.querySelector(selector);

  if (element) {
    const className = element.className;
    if (typeof className === 'string') {
      for (const pattern of patterns) {
        if (className.includes(pattern)) {
          log.debug('Found element matching pattern', pattern);
          return element;
        }
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
  log.debug('Injecting tree view for project', projectId);

  if (document.getElementById(TREE_CONTAINER_ID)) {
    log.debug('Tree already exists');
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

  const container = createTreeContainer();

  const bottomMenu = findElementByClassPattern(sideMenu, SIDEBAR_SELECTORS.bottomMenu);

  if (bottomMenu?.parentElement) {
    bottomMenu.parentElement.insertBefore(container, bottomMenu);
    log.debug('Inserted before bottom menu');
  } else {
    sideMenu.appendChild(container);
    log.debug('Appended to side menu');
  }

  const content = document.getElementById(TREE_CONTENT_ID);
  if (content) {
    setupResizeObserver(sidebar);
    updateTheme();
    themeCleanup = onThemeChange(updateTheme);
    loadTree(content, projectId);
    return true;
  }

  return false;
}

export function removeTree(): void {
  if (sidebarResizeObserver) {
    sidebarResizeObserver.disconnect();
    sidebarResizeObserver = null;
  }

  if (themeCleanup) {
    themeCleanup();
    themeCleanup = null;
  }

  const existing = document.getElementById(TREE_CONTAINER_ID);
  if (existing) {
    existing.remove();
    log.debug('Tree removed');
  }
}

export function tryInject(projectId: string, maxRetries = 10, delay = 300): void {
  let retries = maxRetries;

  function attempt(): void {
    if (retries <= 0) {
      log.warn('Injection failed after max retries');
      return;
    }

    const success = inject(projectId);
    if (!success) {
      retries--;
      log.debug('Injection failed, retrying', { retriesLeft: retries });
      setTimeout(attempt, delay);
    }
  }

  attempt();
}

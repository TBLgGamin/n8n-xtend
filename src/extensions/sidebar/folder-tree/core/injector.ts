import { buildWorkflowUrl, findElementByClassPattern, logger, showToast } from '@/shared/utils';
import { clearFolderCache, createNewFolder, createNewWorkflow } from '../api';
import { clearSelection } from './dragdrop';
import { getTreeState, loadTree } from './tree';

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

function handleNewFolder(): void {
  const state = getTreeState();
  if (!state) return;
  createNewFolder(state.projectId, '0').then((id) => {
    if (id) {
      clearFolderCache();
      loadTree(state.rootContainer, state.projectId);
      showToast({ message: 'Folder created' });
    }
  });
}

function handleNewWorkflow(): void {
  const state = getTreeState();
  if (!state) return;
  createNewWorkflow(state.projectId, '0').then((id) => {
    if (id) {
      window.location.href = buildWorkflowUrl(id);
    }
  });
}

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  const header = document.createElement('div');
  header.className = 'n8n-xtend-folder-tree-header';

  const title = document.createElement('span');
  title.textContent = 'Folders';

  const actions = document.createElement('div');
  actions.className = 'n8n-xtend-folder-tree-header-actions';

  const newFolderBtn = document.createElement('button');
  newFolderBtn.className = 'n8n-xtend-folder-tree-header-btn';
  newFolderBtn.title = 'New Folder';
  newFolderBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`;
  newFolderBtn.addEventListener('click', handleNewFolder);

  const newWorkflowBtn = document.createElement('button');
  newWorkflowBtn.className = 'n8n-xtend-folder-tree-header-btn';
  newWorkflowBtn.title = 'New Workflow';
  newWorkflowBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  newWorkflowBtn.addEventListener('click', handleNewWorkflow);

  actions.appendChild(newFolderBtn);
  actions.appendChild(newWorkflowBtn);
  header.appendChild(title);
  header.appendChild(actions);

  const content = document.createElement('div');
  content.id = CONTENT_ID;

  container.appendChild(header);
  container.appendChild(content);
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

    content.addEventListener('click', (event) => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        clearSelection();
      }
    });

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

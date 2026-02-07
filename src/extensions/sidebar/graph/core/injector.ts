import { logger } from '@/shared/utils';
import { icons } from '../icons';

const log = logger.child('graph:injector');

const MENU_ITEM_ID = 'n8n-xtend-graph';
const GRAPH_VIEW_ID = 'n8n-xtend-graph-view';
const CHAT_MENU_ITEM_SELECTOR = '[data-test-id="project-chat-menu-item"]';
const SIDEBAR_LISTENER_ATTR = 'data-xtend-graph-listener';

let graphViewActive = false;
let activeUrl = '';
let previouslyActiveLink: HTMLElement | null = null;
let previousActiveClass = '';

function getContentWrapper(): HTMLElement | null {
  const content = document.getElementById('content');
  if (!content) return null;
  return content.querySelector(
    `[class*="_contentWrapper_"]:not(#${GRAPH_VIEW_ID})`,
  ) as HTMLElement | null;
}

function findActiveClass(): string {
  const activeLink = document.querySelector('a[class*="_active_"][class*="_menuItem_"]');
  if (!activeLink) return '';
  return Array.from(activeLink.classList).find((c) => c.includes('_active_')) ?? '';
}

function setGraphActive(): void {
  const activeClass = findActiveClass();
  if (!activeClass) return;

  previousActiveClass = activeClass;

  const currentActive = document.querySelector(`a.${activeClass}[class*="_menuItem_"]`);
  if (currentActive && !currentActive.closest(`#${MENU_ITEM_ID}`)) {
    previouslyActiveLink = currentActive as HTMLElement;
    previouslyActiveLink.classList.remove(activeClass);
  }

  const graphLink = document.querySelector(`#${MENU_ITEM_ID} a`);
  if (graphLink) graphLink.classList.add(activeClass);
}

function clearGraphActive(): void {
  if (!previousActiveClass) return;

  const graphLink = document.querySelector(`#${MENU_ITEM_ID} a`);
  if (graphLink) graphLink.classList.remove(previousActiveClass);

  if (previouslyActiveLink) {
    previouslyActiveLink.classList.add(previousActiveClass);
    previouslyActiveLink = null;
  }

  previousActiveClass = '';
}

function activateGraphView(): void {
  if (graphViewActive) return;

  const contentWrapper = getContentWrapper();
  if (!contentWrapper) {
    log.debug('Content wrapper not found');
    return;
  }

  const content = document.getElementById('content');
  if (!content) return;

  contentWrapper.style.display = 'none';

  const graphView = document.createElement('div');
  graphView.id = GRAPH_VIEW_ID;
  content.appendChild(graphView);

  graphViewActive = true;
  activeUrl = window.location.href;
  setGraphActive();
  log.debug('Graph view activated');
}

function deactivateGraphView(): void {
  if (!graphViewActive) return;

  const graphView = document.getElementById(GRAPH_VIEW_ID);
  if (graphView) graphView.remove();

  const contentWrapper = getContentWrapper();
  if (contentWrapper) contentWrapper.style.display = '';

  clearGraphActive();
  graphViewActive = false;
  log.debug('Graph view deactivated');
}

function toggleGraphView(): void {
  if (graphViewActive) {
    deactivateGraphView();
  } else {
    activateGraphView();
  }
}

function setupSidebarClickListener(): void {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar.hasAttribute(SIDEBAR_LISTENER_ATTR)) return;

  sidebar.setAttribute(SIDEBAR_LISTENER_ATTR, 'true');
  sidebar.addEventListener('click', (e) => {
    if (!graphViewActive) return;

    const target = e.target as HTMLElement;
    const clickedItem = target.closest('[data-test-id$="menu-item"]');
    if (clickedItem && !clickedItem.closest(`#${MENU_ITEM_ID}`)) {
      deactivateGraphView();
    }
  });
}

function createGraphMenuItem(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-test-id', 'project-graph-menu-item');
  wrapper.id = MENU_ITEM_ID;

  const chatItem = document.querySelector(CHAT_MENU_ITEM_SELECTOR);
  wrapper.className = chatItem?.className ?? '';

  const chatLink = chatItem?.querySelector('a');
  const iconClass = chatLink?.querySelector('[class*="menuItemIcon"]')?.className ?? '';
  const labelClass = chatLink?.querySelector('[class*="menuItemLabel"]')?.className ?? '';
  const textClass = chatLink?.querySelector('[class*="menuItemText"]')?.className ?? '';

  const link = document.createElement('a');
  link.href = '#';
  link.className = chatLink?.className ?? '';
  link.setAttribute('role', 'menuitem');
  link.setAttribute('aria-label', 'Graph');

  const iconDiv = document.createElement('div');
  iconDiv.className = iconClass;
  iconDiv.innerHTML = icons.graph;

  const labelDiv = document.createElement('div');
  labelDiv.className = labelClass;

  const textSpan = document.createElement('span');
  textSpan.className = textClass;
  textSpan.textContent = 'Graph';

  labelDiv.appendChild(textSpan);
  link.appendChild(iconDiv);
  link.appendChild(labelDiv);

  link.addEventListener('click', (e) => {
    e.preventDefault();
    toggleGraphView();
  });

  wrapper.appendChild(link);
  return wrapper;
}

export function injectGraphMenuItem(): boolean {
  if (document.getElementById(MENU_ITEM_ID)) return true;

  const chatMenuItem = document.querySelector(CHAT_MENU_ITEM_SELECTOR);
  if (!chatMenuItem?.parentElement) return false;

  const menuItem = createGraphMenuItem();
  chatMenuItem.parentElement.insertBefore(menuItem, chatMenuItem.nextSibling);
  setupSidebarClickListener();
  log.debug('Graph menu item injected');
  return true;
}

export function removeGraphMenuItem(): void {
  deactivateGraphView();
  const existing = document.getElementById(MENU_ITEM_ID);
  if (existing) {
    existing.remove();
    log.debug('Graph menu item removed');
  }
}

export function checkNavigationChange(): void {
  if (!graphViewActive) return;
  if (window.location.href !== activeUrl) {
    deactivateGraphView();
  }
}

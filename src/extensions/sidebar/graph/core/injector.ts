import type { WorkflowDetail } from '@/shared/types';
import { emit, escapeHtml, logger } from '@/shared/utils';
import { icons } from '../icons';
import { type CanvasController, createCanvas } from './canvas';
import { loadProjectWorkflows } from './data';
import { renderCallGraph } from './renderer';

const log = logger.child('graph:injector');

const MENU_ITEM_ID = 'n8n-xtend-graph';
const GRAPH_VIEW_ID = 'n8n-xtend-graph-view';
const CHAT_MENU_ITEM_SELECTOR = '[data-test-id="project-chat-menu-item"]';
const SIDEBAR_LISTENER_ATTR = 'data-xtend-graph-listener';

let graphViewActive = false;
let activeUrl = '';
let previouslyActiveLink: HTMLElement | null = null;
let previousActiveClass = '';
let currentProjectId: string | null = null;
let activeCanvasController: CanvasController | null = null;

export function setProjectId(projectId: string): void {
  currentProjectId = projectId;
}

function getContentWrapper(): HTMLElement | null {
  const content = document.getElementById('content');
  if (!content) return null;
  return content.querySelector(
    `[class*="_contentWrapper_"]:not(#${GRAPH_VIEW_ID})`,
  ) as HTMLElement | null;
}

function getProjectMainContent(): HTMLElement | null {
  const contentWrapper = getContentWrapper();
  if (!contentWrapper) return null;
  return contentWrapper.querySelector('main') as HTMLElement | null;
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

function renderLoadingState(container: HTMLElement, loaded: number, total: number): void {
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:8px;color:var(--color-text-base, #666);">
    <div style="font-size:14px;">Loading workflows\u2026</div>
    <div style="font-size:12px;opacity:0.7;">${escapeHtml(`${loaded} / ${total}`)} (${escapeHtml(String(percent))}%)</div>
  </div>`;
}

function renderErrorState(container: HTMLElement): void {
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:8px;color:var(--color-text-base, #666);">
    <div style="font-size:14px;">Failed to load workflows</div>
  </div>`;
}

const HIGHLIGHT_CLASS = 'n8n-xtend-graph-card-highlight';
const DIM_CLASS = 'n8n-xtend-graph-card-dim';

function createSearchBox(canvas: CanvasController): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'n8n-xtend-graph-search';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search workflows\u2026';
  input.className = 'n8n-xtend-graph-search-input';
  container.appendChild(input);

  const counter = document.createElement('span');
  counter.className = 'n8n-xtend-graph-search-counter';
  container.appendChild(counter);

  let matchedCards: HTMLElement[] = [];
  let currentIndex = -1;

  function clearHighlights(): void {
    const allCards = canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-card');
    for (const card of allCards) {
      card.classList.remove(HIGHLIGHT_CLASS, DIM_CLASS);
    }
    matchedCards = [];
    currentIndex = -1;
    counter.textContent = '';
  }

  function panToCard(card: HTMLElement): void {
    const x = Number.parseFloat(card.style.left);
    const y = Number.parseFloat(card.style.top);
    const w = card.offsetWidth || 220;
    const h = card.offsetHeight || 80;
    canvas.panTo(x + w / 2, y + h / 2);
  }

  function updateCounter(): void {
    if (matchedCards.length === 0) {
      counter.textContent = input.value ? '0 / 0' : '';
      return;
    }
    counter.textContent = `${currentIndex + 1} / ${matchedCards.length}`;
  }

  function navigateToMatch(index: number): void {
    if (matchedCards.length === 0) return;

    const prev = matchedCards[currentIndex];
    if (prev) prev.classList.remove(HIGHLIGHT_CLASS);

    currentIndex = ((index % matchedCards.length) + matchedCards.length) % matchedCards.length;

    const card = matchedCards[currentIndex];
    if (card) {
      card.classList.add(HIGHLIGHT_CLASS);
      panToCard(card);
    }
    updateCounter();
  }

  function performSearch(): void {
    clearHighlights();
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    const allCards = canvas.transformLayer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card');
    for (const card of allCards) {
      const name =
        card.querySelector('.n8n-xtend-graph-card-name')?.textContent?.toLowerCase() ?? '';
      if (name.includes(query)) {
        matchedCards.push(card);
      } else {
        card.classList.add(DIM_CLASS);
      }
    }

    if (matchedCards.length > 0) {
      navigateToMatch(0);
    }
    updateCounter();
  }

  input.addEventListener('input', performSearch);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        navigateToMatch(currentIndex - 1);
      } else {
        navigateToMatch(currentIndex + 1);
      }
    }
    if (e.key === 'Escape') {
      input.value = '';
      clearHighlights();
      input.blur();
    }
  });

  return container;
}

function createToolbar(canvas: CanvasController): HTMLDivElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'n8n-xtend-graph-toolbar';

  const fitBtn = document.createElement('button');
  fitBtn.className = 'n8n-xtend-graph-toolbar-btn';
  fitBtn.title = 'Fit to view';
  fitBtn.innerHTML = icons.fitView;
  fitBtn.addEventListener('click', () => canvas.fitToView());

  toolbar.appendChild(fitBtn);
  return toolbar;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const MINIMAP_CARD_COLOR = 'var(--n8n-xtend-color-border-secondary)';
const MINIMAP_VIEWPORT_COLOR = 'rgba(100, 150, 255, 0.25)';
const MINIMAP_VIEWPORT_STROKE = 'rgba(100, 150, 255, 0.6)';

function createMinimap(canvas: CanvasController): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'n8n-xtend-graph-minimap';

  const minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = MINIMAP_WIDTH;
  minimapCanvas.height = MINIMAP_HEIGHT;
  container.appendChild(minimapCanvas);

  const ctx = minimapCanvas.getContext('2d');
  if (!ctx) return container;

  function getContentBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    const cards = canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-card');
    if (cards.length === 0) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const card of cards) {
      const el = card as HTMLElement;
      const x = Number.parseFloat(el.style.left);
      const y = Number.parseFloat(el.style.top);
      const w = el.offsetWidth || 220;
      const h = el.offsetHeight || 80;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    return { minX, minY, maxX, maxY };
  }

  function render(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    const bounds = getContentBounds();
    if (!bounds) return;

    const { panX, panY, scale } = canvas.getTransform();
    const vw = canvas.viewport.clientWidth;
    const vh = canvas.viewport.clientHeight;

    const viewLeft = -panX / scale;
    const viewTop = -panY / scale;
    const viewRight = viewLeft + vw / scale;
    const viewBottom = viewTop + vh / scale;

    const allMinX = Math.min(bounds.minX, viewLeft);
    const allMinY = Math.min(bounds.minY, viewTop);
    const allMaxX = Math.max(bounds.maxX, viewRight);
    const allMaxY = Math.max(bounds.maxY, viewBottom);

    const contentW = allMaxX - allMinX;
    const contentH = allMaxY - allMinY;
    if (contentW <= 0 || contentH <= 0) return;

    const pad = 8;
    const drawW = MINIMAP_WIDTH - pad * 2;
    const drawH = MINIMAP_HEIGHT - pad * 2;
    const mapScale = Math.min(drawW / contentW, drawH / contentH);
    const offsetX = pad + (drawW - contentW * mapScale) / 2;
    const offsetY = pad + (drawH - contentH * mapScale) / 2;

    const toMX = (x: number) => offsetX + (x - allMinX) * mapScale;
    const toMY = (y: number) => offsetY + (y - allMinY) * mapScale;

    const cards = canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-card');
    ctx.fillStyle = MINIMAP_CARD_COLOR;
    for (const card of cards) {
      const el = card as HTMLElement;
      const x = Number.parseFloat(el.style.left);
      const y = Number.parseFloat(el.style.top);
      const w = (el.offsetWidth || 220) * mapScale;
      const h = (el.offsetHeight || 80) * mapScale;
      ctx.fillRect(toMX(x), toMY(y), Math.max(w, 2), Math.max(h, 2));
    }

    const vrX = toMX(viewLeft);
    const vrY = toMY(viewTop);
    const vrW = (vw / scale) * mapScale;
    const vrH = (vh / scale) * mapScale;

    ctx.fillStyle = MINIMAP_VIEWPORT_COLOR;
    ctx.fillRect(vrX, vrY, vrW, vrH);
    ctx.strokeStyle = MINIMAP_VIEWPORT_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(vrX, vrY, vrW, vrH);
  }

  canvas.onTransformChange(render);
  requestAnimationFrame(render);

  return container;
}

function renderReadyState(container: HTMLElement, workflows: Map<string, WorkflowDetail>): void {
  container.innerHTML = '';
  const canvas = createCanvas(container);
  renderCallGraph(canvas.transformLayer, workflows);
  canvas.viewport.appendChild(createSearchBox(canvas));
  canvas.viewport.appendChild(createToolbar(canvas));
  canvas.viewport.appendChild(createMinimap(canvas));
  activeCanvasController = canvas;
}

function activateGraphView(): void {
  if (graphViewActive) return;

  const mainContent = getProjectMainContent();
  if (!mainContent?.parentElement) {
    log.debug('Main content area not found');
    return;
  }

  mainContent.style.display = 'none';

  const graphView = document.createElement('div');
  graphView.id = GRAPH_VIEW_ID;
  graphView.className = mainContent.className;
  graphView.style.position = 'relative';
  graphView.style.overflow = 'hidden';
  mainContent.parentElement.appendChild(graphView);

  graphViewActive = true;
  activeUrl = window.location.href;
  setGraphActive();
  log.debug('Graph view activated');

  if (currentProjectId) {
    emit('graph:activated', { projectId: currentProjectId });
  }

  if (currentProjectId) {
    renderLoadingState(graphView, 0, 0);
    loadProjectWorkflows(currentProjectId, (loaded, total) => {
      const view = document.getElementById(GRAPH_VIEW_ID);
      if (view) renderLoadingState(view, loaded, total);
    }).then((result) => {
      const view = document.getElementById(GRAPH_VIEW_ID);
      if (!view) return;
      if (result) {
        renderReadyState(view, result.workflows);
      } else {
        renderErrorState(view);
      }
    });
  }
}

function deactivateGraphView(): void {
  if (!graphViewActive) return;

  activeCanvasController?.destroy();
  activeCanvasController = null;

  const graphView = document.getElementById(GRAPH_VIEW_ID);
  if (graphView) graphView.remove();

  const mainContent = getProjectMainContent();
  if (mainContent) mainContent.style.display = '';

  clearGraphActive();
  graphViewActive = false;
  log.debug('Graph view deactivated');
  emit('graph:deactivated', {});
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

import type { WorkflowDetail } from '@/shared/types';
import {
  buildWorkflowUrl,
  emit,
  getLocalItem,
  isWorkflowPage,
  logger,
  setLocalItem,
} from '@/shared/utils';
import { icons } from '../icons';
import { type CanvasController, createCanvas } from './canvas';
import { loadProjectWorkflowsSmart } from './data';
import { CARD_HEIGHT, CARD_WIDTH } from './graph-builder';
import { renderCallGraph } from './renderer';

const log = logger.child('graph:injector');

const MENU_ITEM_ID = 'n8n-xtend-graph';
const GRAPH_VIEW_ID = 'n8n-xtend-graph-view';
const CHAT_MENU_ITEM_SELECTOR = '[data-test-id="project-chat-menu-item"]';
const SIDEBAR_LISTENER_ATTR = 'data-xtend-graph-listener';
const GRAPH_URL_PARAM = 'xtend-graph';

const HIGHLIGHT_CLASS = 'n8n-xtend-graph-card-highlight';
const DIM_CLASS = 'n8n-xtend-graph-card-dim';

const CULL_PADDING = 300;

let graphViewActive = false;
let activeUrl = '';
let previouslyActiveLink: HTMLElement | null = null;
let previousActiveClass = '';
let currentProjectId: string | null = null;
let activeCanvasController: CanvasController | null = null;

export function setProjectId(projectId: string): void {
  currentProjectId = projectId;
}

function setGraphUrlParam(): void {
  const url = new URL(window.location.href);
  if (url.searchParams.has(GRAPH_URL_PARAM)) return;
  url.searchParams.set(GRAPH_URL_PARAM, '1');
  history.replaceState(history.state, '', url.toString());
}

function removeGraphUrlParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(GRAPH_URL_PARAM)) return;
  url.searchParams.delete(GRAPH_URL_PARAM);
  history.replaceState(history.state, '', url.toString());
}

function hasGraphUrlParam(): boolean {
  return new URL(window.location.href).searchParams.has(GRAPH_URL_PARAM);
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

function renderLoadingScreen(container: HTMLElement): void {
  container.innerHTML = '';
  const loader = document.createElement('div');
  loader.className = 'n8n-xtend-graph-loader';

  const text = document.createElement('div');
  text.className = 'n8n-xtend-graph-loader-text';
  text.textContent = 'Loading workflows\u2026';
  loader.appendChild(text);

  const bar = document.createElement('div');
  bar.className = 'n8n-xtend-graph-loader-bar';
  const fill = document.createElement('div');
  fill.className = 'n8n-xtend-graph-loader-fill';
  fill.style.width = '0%';
  bar.appendChild(fill);
  loader.appendChild(bar);

  container.appendChild(loader);
}

function updateLoadingProgress(container: HTMLElement, loaded: number, total: number): void {
  const text = container.querySelector<HTMLElement>('.n8n-xtend-graph-loader-text');
  const fill = container.querySelector<HTMLElement>('.n8n-xtend-graph-loader-fill');
  if (!text || !fill) return;
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
  text.textContent = `Loading workflows\u2026 ${loaded} / ${total}`;
  fill.style.width = `${percent}%`;
}

function renderErrorState(container: HTMLElement): void {
  container.innerHTML = '';
  const loader = document.createElement('div');
  loader.className = 'n8n-xtend-graph-loader';

  const text = document.createElement('div');
  text.className = 'n8n-xtend-graph-loader-text';
  text.textContent = 'Failed to load workflows';
  loader.appendChild(text);

  container.appendChild(loader);
}

const EXPANDED_CLASS = 'n8n-xtend-graph-card-expanded';
const PINNED_CLASS = 'n8n-xtend-graph-card-pinned';
const EXPANDED_STORAGE_KEY = 'n8n-xtend-graph-expanded';

function getExpandedIds(): Set<string> {
  const stored = getLocalItem<string[]>(EXPANDED_STORAGE_KEY);
  return new Set(stored ?? []);
}

function saveExpandedIds(ids: Set<string>): void {
  setLocalItem(EXPANDED_STORAGE_KEY, [...ids]);
}

function toggleDetailPin(card: HTMLElement): void {
  card.classList.toggle(PINNED_CLASS);
  if (card.classList.contains(PINNED_CLASS)) {
    card.classList.add(EXPANDED_CLASS);
  }
}

function attachCardListeners(card: HTMLElement): void {
  card.addEventListener('mouseenter', () => {
    if (!card.classList.contains(PINNED_CLASS)) {
      card.classList.add(EXPANDED_CLASS);
    }
  });

  card.addEventListener('mouseleave', () => {
    if (!card.classList.contains(PINNED_CLASS)) {
      card.classList.remove(EXPANDED_CLASS);
    }
  });
}

function setupCardInteraction(
  canvas: CanvasController,
  workflows: Map<string, WorkflowDetail>,
  container: HTMLElement,
): void {
  const cards = canvas.transformLayer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card');
  log.debug(`Setting up interaction for ${cards.length} cards`);

  for (const card of cards) {
    attachCardListeners(card);
  }

  canvas.transformLayer.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.n8n-xtend-graph-card');
    if (!card) return;

    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('.n8n-xtend-graph-card-link');
    if (link) e.preventDefault();

    const wfId = card.dataset.workflowId ?? '';

    if (card.dataset.hasChildren === 'true') {
      const expandedIds = getExpandedIds();
      if (expandedIds.has(wfId)) {
        expandedIds.delete(wfId);
      } else {
        expandedIds.add(wfId);
      }
      saveExpandedIds(expandedIds);
      log.debug('Tree toggle, re-rendering', { workflowId: wfId });
      renderGraph(container, workflows, true);
    } else {
      toggleDetailPin(card);
    }
  });
}

function isCardVisible(
  x: number,
  y: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  return x + CARD_WIDTH >= left && x <= right && y + CARD_HEIGHT >= top && y <= bottom;
}

function cullCardsInBounds(
  layer: HTMLElement,
  left: number,
  top: number,
  right: number,
  bottom: number,
): Set<string> {
  const visibleIds = new Set<string>();
  for (const card of layer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card')) {
    const x = Number.parseFloat(card.style.left);
    const y = Number.parseFloat(card.style.top);
    const visible = isCardVisible(x, y, left, top, right, bottom);
    card.style.display = visible ? '' : 'none';
    if (visible && card.dataset.workflowId) {
      visibleIds.add(card.dataset.workflowId);
    }
  }
  return visibleIds;
}

function cullEdgesByVisibility(layer: HTMLElement, visibleIds: Set<string>): void {
  for (const edge of layer.querySelectorAll<SVGPathElement>('.n8n-xtend-graph-edge')) {
    const fromVisible = visibleIds.has(edge.dataset.fromId ?? '');
    const toVisible = visibleIds.has(edge.dataset.toId ?? '');
    const group = edge.parentElement as unknown as SVGGElement;
    group.style.display = fromVisible || toVisible ? '' : 'none';
  }
}

function setupViewportCulling(canvas: CanvasController): void {
  function cull(): void {
    const bounds = canvas.getViewportBounds();
    const left = bounds.left - CULL_PADDING;
    const top = bounds.top - CULL_PADDING;
    const right = bounds.right + CULL_PADDING;
    const bottom = bounds.bottom + CULL_PADDING;

    const visibleIds = cullCardsInBounds(canvas.transformLayer, left, top, right, bottom);
    cullEdgesByVisibility(canvas.transformLayer, visibleIds);
  }

  canvas.onTransformChange(cull);
  cull();
}

function buildSearchableText(workflow: WorkflowDetail): string {
  return workflow.name.toLowerCase();
}

function createCommandBar(
  canvas: CanvasController,
  workflows: Map<string, WorkflowDetail>,
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'n8n-xtend-graph-cmdbar';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'n8n-xtend-graph-cmdbar-search';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'n8n-xtend-graph-cmdbar-icon';
  searchIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;
  searchWrap.appendChild(searchIcon);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search workflows\u2026';
  input.className = 'n8n-xtend-graph-cmdbar-input';
  searchWrap.appendChild(input);

  const counter = document.createElement('span');
  counter.className = 'n8n-xtend-graph-cmdbar-counter';
  searchWrap.appendChild(counter);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'n8n-xtend-graph-cmdbar-nav';
  prevBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  prevBtn.title = 'Previous (Shift+Enter)';
  searchWrap.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'n8n-xtend-graph-cmdbar-nav';
  nextBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  nextBtn.title = 'Next (Enter)';
  searchWrap.appendChild(nextBtn);

  const ghost = document.createElement('span');
  ghost.className = 'n8n-xtend-graph-cmdbar-ghost';
  searchWrap.appendChild(ghost);

  container.appendChild(searchWrap);

  const allNames = [...workflows.values()].map((wf) => wf.name).sort();

  const searchIndex = new Map<string, string>();
  for (const [id, wf] of workflows) {
    searchIndex.set(id, buildSearchableText(wf));
  }

  let matchedCards: HTMLElement[] = [];
  let currentIndex = -1;

  function clearHighlights(): void {
    for (const card of canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-card')) {
      card.classList.remove(HIGHLIGHT_CLASS, DIM_CLASS);
    }
    matchedCards = [];
    currentIndex = -1;
    counter.textContent = '';
    ghost.textContent = '';
  }

  function panToCard(card: HTMLElement): void {
    const x = Number.parseFloat(card.style.left);
    const y = Number.parseFloat(card.style.top);
    canvas.panTo(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
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

  function applySearchVisuals(query: string): void {
    const allCards = canvas.transformLayer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card');
    for (const card of allCards) {
      const wfId = card.dataset.workflowId ?? '';
      const text = searchIndex.get(wfId) ?? '';
      if (text.includes(query)) {
        matchedCards.push(card);
      } else {
        card.classList.add(DIM_CLASS);
      }
    }
  }

  const measure = document.createElement('span');
  measure.style.cssText =
    'position:absolute;visibility:hidden;white-space:pre;font:inherit;font-size:12px;';
  searchWrap.appendChild(measure);

  function updateGhostText(query: string): void {
    if (!query) {
      ghost.textContent = '';
      return;
    }
    const match = allNames.find((n) => n.toLowerCase().startsWith(query));
    if (match) {
      measure.textContent = input.value;
      ghost.style.left = `${28 + measure.offsetWidth}px`;
      ghost.textContent = match.slice(query.length);
    } else {
      ghost.textContent = '';
    }
  }

  function acceptGhostText(): boolean {
    const query = input.value.trim().toLowerCase();
    if (!query) return false;
    const match = allNames.find((n) => n.toLowerCase().startsWith(query));
    if (match && match.toLowerCase() !== query) {
      input.value = match;
      performSearch();
      return true;
    }
    return false;
  }

  function performSearch(): void {
    clearHighlights();
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    applySearchVisuals(query);

    if (matchedCards.length > 0) navigateToMatch(0);
    updateCounter();
    updateGhostText(query);
  }

  input.addEventListener('input', performSearch);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && ghost.textContent) {
      e.preventDefault();
      acceptGhostText();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) navigateToMatch(currentIndex - 1);
      else navigateToMatch(currentIndex + 1);
    }
    if (e.key === 'Escape') {
      input.value = '';
      clearHighlights();
      input.blur();
    }
  });

  prevBtn.addEventListener('click', () => navigateToMatch(currentIndex - 1));
  nextBtn.addEventListener('click', () => navigateToMatch(currentIndex + 1));

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
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + CARD_WIDTH);
      maxY = Math.max(maxY, y + CARD_HEIGHT);
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
      const w = CARD_WIDTH * mapScale;
      const h = CARD_HEIGHT * mapScale;
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

function renderGraph(
  container: HTMLElement,
  workflows: Map<string, WorkflowDetail>,
  preserveTransform?: boolean,
): void {
  const expandedIds = getExpandedIds();
  const savedTransform = preserveTransform ? activeCanvasController?.getTransform() : null;

  log.debug(`Rendering graph with ${workflows.size} workflows, ${expandedIds.size} expanded`);
  activeCanvasController?.destroy();
  container.innerHTML = '';
  const canvas = createCanvas(container);
  renderCallGraph(canvas.transformLayer, workflows, expandedIds);

  setupCardInteraction(canvas, workflows, container);

  canvas.viewport.appendChild(createCommandBar(canvas, workflows));
  canvas.viewport.appendChild(createToolbar(canvas));
  canvas.viewport.appendChild(createMinimap(canvas));

  if (savedTransform) {
    canvas.setTransform(savedTransform);
  } else {
    canvas.fitToView();
  }
  setupViewportCulling(canvas);
  activeCanvasController = canvas;
}

function renderReadyState(container: HTMLElement, workflows: Map<string, WorkflowDetail>): void {
  renderGraph(container, workflows, false);
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
  setGraphUrlParam();
  activeUrl = window.location.href;
  setGraphActive();
  log.debug('Graph view activated');

  if (currentProjectId) {
    emit('graph:activated', { projectId: currentProjectId });
  }

  if (currentProjectId) {
    log.debug('Starting workflow load', { projectId: currentProjectId });
    renderLoadingScreen(graphView);
    loadProjectWorkflowsSmart(currentProjectId, {
      onProgress: (loaded, total) => {
        const view = document.getElementById(GRAPH_VIEW_ID);
        if (view) updateLoadingProgress(view, loaded, total);
      },
    }).then((result) => {
      const view = document.getElementById(GRAPH_VIEW_ID);
      if (!view) {
        log.warn('Graph view element not found for ready render');
        return;
      }
      if (result) {
        log.debug('Load complete, rendering full graph', {
          size: result.workflows.size,
          fromCache: result.fromCache,
        });
        renderReadyState(view, result.workflows);
      } else {
        log.warn('Load returned null, showing error state');
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
  removeGraphUrlParam();
  log.debug('Graph view deactivated');
  emit('graph:deactivated', {});
}

function navigateToFirstWorkflow(): void {
  if (!currentProjectId) return;
  loadProjectWorkflowsSmart(currentProjectId, {}).then((result) => {
    if (!result) return;
    const first = [...result.workflows.values()][0];
    if (first) {
      const url = new URL(buildWorkflowUrl(first.id));
      url.searchParams.set(GRAPH_URL_PARAM, '1');
      window.location.href = url.toString();
    }
  });
}

export function resumePendingGraph(): void {
  if (hasGraphUrlParam()) {
    activateGraphView();
  }
}

function toggleGraphView(): void {
  if (graphViewActive) {
    deactivateGraphView();
  } else if (isWorkflowPage()) {
    activateGraphView();
  } else {
    navigateToFirstWorkflow();
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
  const current = new URL(window.location.href);
  const stored = new URL(activeUrl);
  current.searchParams.delete(GRAPH_URL_PARAM);
  stored.searchParams.delete(GRAPH_URL_PARAM);
  if (current.toString() !== stored.toString()) {
    deactivateGraphView();
  }
}

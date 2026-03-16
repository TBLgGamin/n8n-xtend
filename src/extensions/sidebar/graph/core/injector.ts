import type { WorkflowDetail } from '@/shared/types';
import { buildWorkflowUrl, emit, escapeHtml, isWorkflowPage, logger } from '@/shared/utils';
import { icons } from '../icons';
import { type CanvasController, createCanvas } from './canvas';
import { loadProjectWorkflows } from './data';
import type { DependencyMap } from './graph-builder';
import { renderCallGraph } from './renderer';

const log = logger.child('graph:injector');

const MENU_ITEM_ID = 'n8n-xtend-graph';
const GRAPH_VIEW_ID = 'n8n-xtend-graph-view';
const CHAT_MENU_ITEM_SELECTOR = '[data-test-id="project-chat-menu-item"]';
const SIDEBAR_LISTENER_ATTR = 'data-xtend-graph-listener';
const PENDING_GRAPH_KEY = 'n8n-xtend-open-graph';

const HIGHLIGHT_CLASS = 'n8n-xtend-graph-card-highlight';
const DIM_CLASS = 'n8n-xtend-graph-card-dim';
const UPSTREAM_CLASS = 'n8n-xtend-graph-card-upstream';
const DOWNSTREAM_CLASS = 'n8n-xtend-graph-card-downstream';
const EDGE_DIM_CLASS = 'n8n-xtend-graph-edge-dim';

let graphViewActive = false;
let activeUrl = '';
let previouslyActiveLink: HTMLElement | null = null;
let previousActiveClass = '';
let currentProjectId: string | null = null;
let activeCanvasController: CanvasController | null = null;
let activeDependencies: DependencyMap | null = null;

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

function collectFullChain(
  workflowId: string,
  direction: 'upstream' | 'downstream',
  deps: DependencyMap,
): Set<string> {
  const result = new Set<string>();
  const map = direction === 'upstream' ? deps.upstream : deps.downstream;
  const queue = [workflowId];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) break;
    for (const related of map.get(current) ?? []) {
      if (!result.has(related)) {
        result.add(related);
        queue.push(related);
      }
    }
  }

  return result;
}

function classifyCard(
  cardId: string,
  hoveredId: string,
  upstreamIds: Set<string>,
  downstreamIds: Set<string>,
): string {
  if (cardId === hoveredId) return HIGHLIGHT_CLASS;
  if (upstreamIds.has(cardId)) return UPSTREAM_CLASS;
  if (downstreamIds.has(cardId)) return DOWNSTREAM_CLASS;
  return DIM_CLASS;
}

function applyDepHighlight(layer: HTMLElement, wfId: string, deps: DependencyMap): void {
  const upstreamIds = collectFullChain(wfId, 'upstream', deps);
  const downstreamIds = collectFullChain(wfId, 'downstream', deps);
  const relatedIds = new Set([wfId, ...upstreamIds, ...downstreamIds]);

  for (const c of layer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card')) {
    c.classList.add(classifyCard(c.dataset.workflowId ?? '', wfId, upstreamIds, downstreamIds));
  }
  for (const edge of layer.querySelectorAll('.n8n-xtend-graph-edge')) {
    const fromId = (edge as SVGElement).dataset.fromId ?? '';
    const toId = (edge as SVGElement).dataset.toId ?? '';
    if (!relatedIds.has(fromId) || !relatedIds.has(toId)) {
      edge.classList.add(EDGE_DIM_CLASS);
    }
  }
}

function clearDepHighlight(layer: HTMLElement): void {
  for (const c of layer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card')) {
    c.classList.remove(HIGHLIGHT_CLASS, DIM_CLASS, UPSTREAM_CLASS, DOWNSTREAM_CLASS);
  }
  for (const edge of layer.querySelectorAll('.n8n-xtend-graph-edge')) {
    edge.classList.remove(EDGE_DIM_CLASS);
  }
}

function setupDependencyHighlighting(canvas: CanvasController, deps: DependencyMap): void {
  canvas.transformLayer.addEventListener(
    'mouseenter',
    (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.n8n-xtend-graph-card');
      if (!card?.dataset.workflowId) return;
      applyDepHighlight(canvas.transformLayer, card.dataset.workflowId, deps);
    },
    true,
  );

  canvas.transformLayer.addEventListener(
    'mouseleave',
    (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.n8n-xtend-graph-card');
      if (!card) return;
      clearDepHighlight(canvas.transformLayer);
    },
    true,
  );
}

function setupCardClickNavigation(canvas: CanvasController): void {
  canvas.transformLayer.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('.n8n-xtend-graph-card-link');
    if (!link) return;
    e.preventDefault();
    deactivateGraphView();
    window.location.href = link.href;
  });
}

function buildSearchableText(workflow: WorkflowDetail): string {
  const parts = [workflow.name.toLowerCase()];
  if (workflow.tags) {
    for (const tag of workflow.tags) {
      if (typeof tag === 'object' && tag && 'name' in tag) {
        parts.push((tag as { name: string }).name.toLowerCase());
      }
    }
  }
  for (const node of workflow.nodes) {
    const typeName = node.type.split('.').pop() ?? '';
    parts.push(typeName.toLowerCase());
  }
  return parts.join(' ');
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
  input.placeholder = 'Search name, tag, or node type\u2026';
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
    const allCards = canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-card');
    for (const card of allCards) {
      card.classList.remove(HIGHLIGHT_CLASS, DIM_CLASS);
    }
    const edges = canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-edge');
    for (const edge of edges) {
      edge.classList.remove(EDGE_DIM_CLASS);
    }
    matchedCards = [];
    currentIndex = -1;
    counter.textContent = '';
    ghost.textContent = '';
  }

  function panToCard(card: HTMLElement): void {
    const x = Number.parseFloat(card.style.left);
    const y = Number.parseFloat(card.style.top);
    canvas.panTo(x + 110, y + 40);
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

  function resolveMatchedIds(query: string): Set<string> {
    const ids = new Set<string>();
    for (const [id, text] of searchIndex) {
      if (query && !text.includes(query)) continue;
      ids.add(id);
    }
    return ids;
  }

  function expandWithConnections(ids: Set<string>): void {
    if (!activeDependencies) return;
    const connected = new Set<string>();
    for (const id of ids) {
      for (const up of collectFullChain(id, 'upstream', activeDependencies)) connected.add(up);
      for (const down of collectFullChain(id, 'downstream', activeDependencies))
        connected.add(down);
    }
    for (const id of connected) ids.add(id);
  }

  function applySearchVisuals(matchedIds: Set<string>): void {
    const allCards = canvas.transformLayer.querySelectorAll<HTMLElement>('.n8n-xtend-graph-card');
    for (const card of allCards) {
      const wfId = card.dataset.workflowId ?? '';
      if (matchedIds.has(wfId)) {
        matchedCards.push(card);
      } else {
        card.classList.add(DIM_CLASS);
      }
    }
    for (const edge of canvas.transformLayer.querySelectorAll('.n8n-xtend-graph-edge')) {
      const fromId = (edge as SVGElement).dataset.fromId ?? '';
      const toId = (edge as SVGElement).dataset.toId ?? '';
      if (!matchedIds.has(fromId) || !matchedIds.has(toId)) {
        edge.classList.add(EDGE_DIM_CLASS);
      }
    }
  }

  function updateGhostText(query: string): void {
    if (!query) {
      ghost.textContent = '';
      return;
    }
    const match = allNames.find((n) => n.toLowerCase().startsWith(query));
    ghost.textContent = match ? query + match.slice(query.length) : '';
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

    const matchedIds = resolveMatchedIds(query);
    expandWithConnections(matchedIds);
    applySearchVisuals(matchedIds);

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
      const w = 220;
      const h = 80;
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
      const w = 220 * mapScale;
      const h = 80 * mapScale;
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
  const deps = renderCallGraph(canvas.transformLayer, workflows);
  activeDependencies = deps;

  setupDependencyHighlighting(canvas, deps);
  setupCardClickNavigation(canvas);

  canvas.viewport.appendChild(createCommandBar(canvas, workflows));
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
  activeDependencies = null;

  const graphView = document.getElementById(GRAPH_VIEW_ID);
  if (graphView) graphView.remove();

  const mainContent = getProjectMainContent();
  if (mainContent) mainContent.style.display = '';

  clearGraphActive();
  graphViewActive = false;
  log.debug('Graph view deactivated');
  emit('graph:deactivated', {});
}

function navigateToFirstWorkflow(): void {
  if (!currentProjectId) return;
  loadProjectWorkflows(currentProjectId, () => {}).then((result) => {
    if (!result) return;
    const first = [...result.workflows.values()][0];
    if (first) {
      sessionStorage.setItem(PENDING_GRAPH_KEY, 'true');
      window.location.href = buildWorkflowUrl(first.id);
    }
  });
}

export function resumePendingGraph(): void {
  if (sessionStorage.getItem(PENDING_GRAPH_KEY)) {
    sessionStorage.removeItem(PENDING_GRAPH_KEY);
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
  if (window.location.href !== activeUrl) {
    deactivateGraphView();
  }
}

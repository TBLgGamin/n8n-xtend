import type { WorkflowDetail } from '@/shared/types';
import { buildWorkflowUrl, emit, escapeHtml, isValidId, logger } from '@/shared/utils';
import { icons } from '../icons';
import {
  type ConnectionType,
  type DependencyMap,
  type LayoutEdge,
  type LayoutNode,
  buildCallGraph,
} from './graph-builder';

const log = logger.child('graph:renderer');
const SVG_NS = 'http://www.w3.org/2000/svg';

export function extractTriggerInputNames(workflow: WorkflowDetail): string[] {
  const triggerNode = workflow.nodes.find(
    (node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
  );
  if (!triggerNode) return [];

  const workflowInputs = triggerNode.parameters.workflowInputs as
    | { values?: { name?: string }[] }
    | undefined;

  if (!workflowInputs?.values) return [];

  return workflowInputs.values
    .map((v) => v.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function extractOutputNames(workflow: WorkflowDetail): string[] {
  const outputNode = workflow.nodes.find(
    (node) => node.type === 'n8n-nodes-base.executeWorkflowOutput',
  );
  if (!outputNode) return [];

  const workflowOutputs = outputNode.parameters.workflowOutputs as
    | { values?: { name?: string }[] }
    | undefined;

  if (!workflowOutputs?.values) return [];

  return workflowOutputs.values
    .map((v) => v.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function buildMetaText(workflow: WorkflowDetail, deps: DependencyMap): string {
  const parts: string[] = [];
  const up = deps.upstream.get(workflow.id)?.size ?? 0;
  const down = deps.downstream.get(workflow.id)?.size ?? 0;
  if (up > 0) parts.push(`${up} in`);
  if (down > 0) parts.push(`${down} out`);
  if (parts.length === 0) parts.push('standalone');
  return parts.join(' \u00b7 ');
}

function resolveNames(ids: Set<string>, allWorkflows: Map<string, WorkflowDetail>): string[] {
  const names: string[] = [];
  for (const id of ids) {
    const wf = allWorkflows.get(id);
    if (wf) names.push(wf.name);
  }
  return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function buildDetailHtml(
  workflow: WorkflowDetail,
  deps: DependencyMap,
  allWorkflows: Map<string, WorkflowDetail>,
): string {
  const upIds = deps.upstream.get(workflow.id);
  const downIds = deps.downstream.get(workflow.id);
  const sections: string[] = [];

  if (upIds && upIds.size > 0) {
    const names = resolveNames(upIds, allWorkflows);
    sections.push(
      `<div class="n8n-xtend-graph-detail-label">Called by</div>${names.map((n) => `<div class="n8n-xtend-graph-detail-row">${escapeHtml(n)}</div>`).join('')}`,
    );
  }

  if (downIds && downIds.size > 0) {
    const names = resolveNames(downIds, allWorkflows);
    sections.push(
      `<div class="n8n-xtend-graph-detail-label">Calls</div>${names.map((n) => `<div class="n8n-xtend-graph-detail-row">${escapeHtml(n)}</div>`).join('')}`,
    );
  }

  const inputs = extractTriggerInputNames(workflow);
  if (inputs.length > 0) {
    sections.push(
      `<div class="n8n-xtend-graph-detail-label">Inputs</div>${inputs.map((n) => `<div class="n8n-xtend-graph-detail-row">${escapeHtml(n)}</div>`).join('')}`,
    );
  }

  const outputs = extractOutputNames(workflow);
  if (outputs.length > 0) {
    sections.push(
      `<div class="n8n-xtend-graph-detail-label">Outputs</div>${outputs.map((n) => `<div class="n8n-xtend-graph-detail-row">${escapeHtml(n)}</div>`).join('')}`,
    );
  }

  return sections.join('');
}

function createCardElement(
  workflow: WorkflowDetail,
  left: number,
  top: number,
  deps: DependencyMap,
  allWorkflows: Map<string, WorkflowDetail>,
  hasChildren: boolean,
  parentId?: string,
  isExpanded?: boolean,
): HTMLDivElement | null {
  if (!isValidId(workflow.id)) return null;

  const card = document.createElement('div');
  card.className = 'n8n-xtend-graph-card';
  card.dataset.workflowId = workflow.id;
  if (hasChildren) card.dataset.hasChildren = 'true';
  if (parentId) card.dataset.parentId = parentId;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;

  const link = document.createElement('a');
  link.className = 'n8n-xtend-graph-card-link';
  link.href = buildWorkflowUrl(workflow.id);
  link.addEventListener('click', () => {
    emit('graph:workflow-clicked', { workflowId: workflow.id });
  });

  const iconDiv = document.createElement('div');
  iconDiv.className = 'n8n-xtend-graph-card-icon';
  iconDiv.innerHTML = icons.workflow;
  link.appendChild(iconDiv);

  const content = document.createElement('div');
  content.className = 'n8n-xtend-graph-card-content';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'n8n-xtend-graph-card-name';
  nameDiv.textContent = workflow.name;
  content.appendChild(nameDiv);

  const meta = document.createElement('div');
  meta.className = 'n8n-xtend-graph-card-meta';

  const metaText = document.createElement('span');
  metaText.className = 'n8n-xtend-graph-card-pill';
  metaText.textContent = buildMetaText(workflow, deps);
  meta.appendChild(metaText);

  content.appendChild(meta);
  link.appendChild(content);

  const status = document.createElement('div');
  status.className = `n8n-xtend-graph-card-status ${workflow.active ? 'active' : 'inactive'}`;
  link.appendChild(status);

  if (hasChildren) {
    const toggle = document.createElement('div');
    toggle.className = 'n8n-xtend-graph-card-toggle';
    toggle.textContent = isExpanded ? '\u2212' : '+';
    link.appendChild(toggle);
  }

  card.appendChild(link);

  const detail = document.createElement('div');
  detail.className = 'n8n-xtend-graph-card-detail';
  detail.innerHTML = buildDetailHtml(workflow, deps, allWorkflows);
  card.appendChild(detail);

  return card;
}

const EDGE_LABELS: Record<ConnectionType, string> = {
  'sub-workflow': 'sub-workflow',
  mcp: 'mcp',
};

function createEdgeGroup(edge: LayoutEdge): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');

  const midX = (edge.fromX + edge.toX) / 2;
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`,
  );
  path.setAttribute('class', `n8n-xtend-graph-edge ${edge.type === 'mcp' ? 'mcp' : ''}`);
  path.dataset.fromId = edge.fromId;
  path.dataset.toId = edge.toId;
  g.appendChild(path);

  const labelX = midX;
  const labelY = (edge.fromY + edge.toY) / 2 - 6;
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(labelX));
  text.setAttribute('y', String(labelY));
  text.setAttribute('class', 'n8n-xtend-graph-edge-label');
  text.textContent = EDGE_LABELS[edge.type];
  g.appendChild(text);

  return g;
}

function createEdgesSvg(edges: LayoutEdge[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'n8n-xtend-graph-edges');

  for (const edge of edges) {
    svg.appendChild(createEdgeGroup(edge));
  }

  return svg;
}

interface NodeWithParent {
  node: LayoutNode;
  parentId?: string | undefined;
}

function collectAllNodes(roots: LayoutNode[]): NodeWithParent[] {
  const result: NodeWithParent[] = [];

  function walk(node: LayoutNode, parentId?: string): void {
    result.push({ node, parentId });
    for (const child of node.children) {
      walk(child, node.workflowId);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  return result;
}

function createGroupLabel(text: string, x: number, y: number): HTMLDivElement {
  const label = document.createElement('div');
  label.className = 'n8n-xtend-graph-group-label';
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  label.textContent = text;
  return label;
}

export function renderCallGraph(
  transformLayer: HTMLElement,
  workflows: Map<string, WorkflowDetail>,
  expandedIds?: Set<string>,
): DependencyMap {
  log.debug(`Building call graph for ${workflows.size} workflows`);
  const layout = buildCallGraph(workflows, expandedIds);
  log.debug('Call graph built', {
    roots: layout.roots.length,
    standalone: layout.standalone.length,
    edges: layout.edges.length,
  });

  const fragment = document.createDocumentFragment();
  const showLabels = layout.roots.length > 0 && layout.standalone.length > 0;

  fragment.appendChild(createEdgesSvg(layout.edges));

  if (showLabels && layout.roots.length > 0) {
    fragment.appendChild(createGroupLabel('Flows', 0, 0));
  }

  const connectedNodes = collectAllNodes(layout.roots);
  let cardCount = 0;
  for (const { node, parentId } of connectedNodes) {
    const card = createCardElement(
      node.workflow,
      node.x,
      node.y,
      layout.dependencies,
      workflows,
      node.hasChildren,
      parentId,
      node.children.length > 0,
    );
    if (card) {
      fragment.appendChild(card);
      cardCount++;
    }
  }

  const firstStandalone = layout.standalone[0];
  if (showLabels && firstStandalone) {
    fragment.appendChild(createGroupLabel('Standalone', 0, firstStandalone.y - 28));
  }

  for (const node of layout.standalone) {
    const card = createCardElement(
      node.workflow,
      node.x,
      node.y,
      layout.dependencies,
      workflows,
      false,
    );
    if (card) {
      fragment.appendChild(card);
      cardCount++;
    }
  }

  log.debug(`Appending ${cardCount} cards to transform layer`);
  transformLayer.appendChild(fragment);
  return layout.dependencies;
}

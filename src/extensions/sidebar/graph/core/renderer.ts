import type { WorkflowDetail } from '@/shared/types';
import { buildWorkflowUrl, isValidId } from '@/shared/utils';
import { icons } from '../icons';
import { type LayoutEdge, type LayoutNode, buildCallGraph } from './graph-builder';

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

function createCardElement(
  workflow: WorkflowDetail,
  left: number,
  top: number,
): HTMLDivElement | null {
  if (!isValidId(workflow.id)) return null;

  const card = document.createElement('div');
  card.className = 'n8n-xtend-graph-card';
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;

  const link = document.createElement('a');
  link.className = 'n8n-xtend-graph-card-link';
  link.href = buildWorkflowUrl(workflow.id);

  const header = document.createElement('div');
  header.className = 'n8n-xtend-graph-card-header';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'n8n-xtend-graph-card-icon';
  iconDiv.innerHTML = icons.workflow;

  const nameDiv = document.createElement('div');
  nameDiv.className = 'n8n-xtend-graph-card-name';
  nameDiv.textContent = workflow.name;

  header.appendChild(iconDiv);
  header.appendChild(nameDiv);
  link.appendChild(header);

  const inputNames = extractTriggerInputNames(workflow);
  if (inputNames.length > 0) {
    const inputsDiv = document.createElement('div');
    inputsDiv.className = 'n8n-xtend-graph-card-inputs';
    for (const name of inputNames) {
      const pill = document.createElement('span');
      pill.className = 'n8n-xtend-graph-card-input';
      pill.textContent = name;
      inputsDiv.appendChild(pill);
    }
    link.appendChild(inputsDiv);
  }

  card.appendChild(link);
  return card;
}

function createEdgePath(edge: LayoutEdge): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  const midX = (edge.fromX + edge.toX) / 2;
  path.setAttribute(
    'd',
    `M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`,
  );
  path.setAttribute('class', 'n8n-xtend-graph-edge');
  return path;
}

function createEdgesSvg(edges: LayoutEdge[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'n8n-xtend-graph-edges');

  for (const edge of edges) {
    svg.appendChild(createEdgePath(edge));
  }

  return svg;
}

function collectAllNodes(roots: LayoutNode[]): LayoutNode[] {
  const result: LayoutNode[] = [];

  function walk(node: LayoutNode): void {
    result.push(node);
    for (const child of node.children) {
      walk(child);
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
): void {
  const layout = buildCallGraph(workflows);
  const fragment = document.createDocumentFragment();
  const showLabels = layout.roots.length > 0 && layout.standalone.length > 0;

  fragment.appendChild(createEdgesSvg(layout.edges));

  if (showLabels && layout.roots.length > 0) {
    fragment.appendChild(createGroupLabel('Flows', 0, 0));
  }

  const connectedNodes = collectAllNodes(layout.roots);
  for (const node of connectedNodes) {
    const card = createCardElement(node.workflow, node.x, node.y);
    if (card) fragment.appendChild(card);
  }

  if (showLabels && layout.standalone.length > 0) {
    const standaloneY = layout.standalone[0].y;
    fragment.appendChild(createGroupLabel('Standalone', 0, standaloneY - 28));
  }

  for (const node of layout.standalone) {
    const card = createCardElement(node.workflow, node.x, node.y);
    if (card) fragment.appendChild(card);
  }

  transformLayer.appendChild(fragment);
}

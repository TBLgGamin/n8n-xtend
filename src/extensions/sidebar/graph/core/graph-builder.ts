import type { WorkflowDetail, WorkflowNode } from '@/shared/types';
import { isValidId, logger } from '@/shared/utils';

const log = logger.child('graph:builder');

interface ConnectionTarget {
  node: string;
}

type ConnectionMap = Record<string, { main?: (ConnectionTarget[] | null)[] }>;

export type ConnectionType = 'sub-workflow' | 'mcp';

interface CallChainNode {
  targetId: string;
  connectionType: ConnectionType;
  next: CallChainNode[];
}

export interface CallTreeNode {
  workflowId: string;
  workflow: WorkflowDetail;
  connectionType: ConnectionType;
  children: CallTreeNode[];
}

export interface LayoutNode {
  workflowId: string;
  workflow: WorkflowDetail;
  connectionType: ConnectionType;
  children: LayoutNode[];
  x: number;
  y: number;
}

export interface LayoutEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: ConnectionType;
}

export interface GraphLayout {
  roots: LayoutNode[];
  standalone: LayoutNode[];
  edges: LayoutEdge[];
  uncoveredIds: string[];
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 80;
const LEVEL_GAP = 80;
const SIBLING_GAP = 24;
const TREE_GAP = 48;
const SECTION_GAP = 64;
const LABEL_HEIGHT = 32;
const STANDALONE_COLUMNS = 4;
const STANDALONE_GAP_X = 16;
const STANDALONE_GAP_Y = 16;

function normalizeForMatch(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function buildMcpToolIndex(workflows: Map<string, WorkflowDetail>): Map<string, string> {
  const index = new Map<string, string>();
  for (const [id, workflow] of workflows) {
    const normalized = normalizeForMatch(workflow.name);
    if (normalized && !index.has(normalized)) {
      index.set(normalized, id);
    }
  }
  return index;
}

function extractMcpTargetIds(workflow: WorkflowDetail, toolIndex: Map<string, string>): string[] {
  const targetIds: string[] = [];
  const seen = new Set<string>();

  for (const node of workflow.nodes) {
    if (node.type !== '@n8n/n8n-nodes-langchain.mcpClientTool') continue;

    const includeTools = node.parameters.includeTools;
    if (!Array.isArray(includeTools)) continue;

    for (const toolName of includeTools) {
      if (typeof toolName !== 'string') continue;
      const normalized = normalizeForMatch(toolName);
      const targetId = toolIndex.get(normalized);
      if (targetId && targetId !== workflow.id && !seen.has(targetId)) {
        seen.add(targetId);
        targetIds.push(targetId);
      }
    }
  }

  return targetIds;
}

function extractWorkflowTargetId(node: WorkflowNode): string | undefined {
  const param = node.parameters.workflowId;
  if (typeof param === 'string') return param;
  if (param && typeof param === 'object') {
    return (param as { value?: string }).value;
  }
  return undefined;
}

function buildAdjacencyFromConnections(connections: ConnectionMap): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const [sourceName, outputs] of Object.entries(connections)) {
    if (!outputs.main) continue;
    const targets: string[] = [];
    for (const outputGroup of outputs.main) {
      if (!outputGroup) continue;
      for (const conn of outputGroup) {
        if (conn.node) targets.push(conn.node);
      }
    }
    adjacency.set(sourceName, targets);
  }
  return adjacency;
}

function findEntryNodeNames(nodes: WorkflowNode[], adjacency: Map<string, string[]>): string[] {
  const hasIncoming = new Set<string>();
  for (const targets of adjacency.values()) {
    for (const t of targets) hasIncoming.add(t);
  }
  return nodes.filter((n) => !hasIncoming.has(n.name)).map((n) => n.name);
}

function bfsNodeNames(entryNames: string[], adjacency: Map<string, string[]>): string[] {
  const visited = new Set<string>(entryNames);
  const queue = [...entryNames];
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    ordered.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return ordered;
}

function findEwSuccessors(
  ewName: string,
  adjacency: Map<string, string[]>,
  ewNodeNames: Set<string>,
): string[] {
  const successors: string[] = [];
  const visited = new Set<string>([ewName]);
  const queue: string[] = [];

  for (const neighbor of adjacency.get(ewName) ?? []) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    if (ewNodeNames.has(current)) {
      successors.push(current);
      continue;
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return successors;
}

function buildChainTree(
  ewName: string,
  visited: Set<string>,
  ewTargets: Map<string, string>,
  ewSuccessors: Map<string, string[]>,
  orderIndex: Map<string, number>,
): CallChainNode | null {
  if (visited.has(ewName)) return null;
  visited.add(ewName);

  const targetId = ewTargets.get(ewName);
  if (!targetId) return null;

  const succs = ewSuccessors.get(ewName) ?? [];
  const sortedSuccs = [...succs].sort(
    (a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999),
  );

  const next: CallChainNode[] = [];
  for (const succName of sortedSuccs) {
    const chain = buildChainTree(succName, visited, ewTargets, ewSuccessors, orderIndex);
    if (chain) next.push(chain);
  }

  return { targetId, connectionType: 'sub-workflow', next };
}

function extractCallChains(workflow: WorkflowDetail): CallChainNode[] {
  const adjacency = buildAdjacencyFromConnections(workflow.connections as ConnectionMap);

  const ewTargets = new Map<string, string>();
  for (const node of workflow.nodes) {
    if (node.type !== 'n8n-nodes-base.executeWorkflow') continue;
    const targetId = extractWorkflowTargetId(node);
    if (targetId && isValidId(targetId)) {
      ewTargets.set(node.name, targetId);
    }
  }

  if (ewTargets.size === 0) return [];

  const ewNodeNames = new Set(ewTargets.keys());

  const ewSuccessors = new Map<string, string[]>();
  for (const ewName of ewNodeNames) {
    ewSuccessors.set(ewName, findEwSuccessors(ewName, adjacency, ewNodeNames));
  }

  const hasIncoming = new Set<string>();
  for (const succs of ewSuccessors.values()) {
    for (const s of succs) hasIncoming.add(s);
  }

  const rootEwNames = [...ewNodeNames].filter((n) => !hasIncoming.has(n));

  const entryNames = findEntryNodeNames(workflow.nodes, adjacency);
  const bfsOrder = bfsNodeNames(entryNames, adjacency);
  const orderIndex = new Map(bfsOrder.map((name, i) => [name, i]));
  rootEwNames.sort((a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999));

  const chains: CallChainNode[] = [];
  const visited = new Set<string>();
  for (const rootName of rootEwNames) {
    const chain = buildChainTree(rootName, visited, ewTargets, ewSuccessors, orderIndex);
    if (chain) chains.push(chain);
  }

  return chains;
}

function collectChainTargetIds(chains: CallChainNode[], ids: Set<string>): void {
  for (const chain of chains) {
    ids.add(chain.targetId);
    collectChainTargetIds(chain.next, ids);
  }
}

export function hasEntryTrigger(workflow: WorkflowDetail): boolean {
  return workflow.nodes.some(
    (node) =>
      node.type.endsWith('Trigger') && node.type !== 'n8n-nodes-base.executeWorkflowTrigger',
  );
}

function buildTreeFromChain(
  chain: CallChainNode,
  workflowMap: Map<string, WorkflowDetail>,
  chainMap: Map<string, CallChainNode[]>,
  pathVisited: Set<string>,
): CallTreeNode | null {
  const workflow = workflowMap.get(chain.targetId);
  if (!workflow) return null;
  if (pathVisited.has(chain.targetId)) return null;

  pathVisited.add(chain.targetId);

  const ownChains = chainMap.get(chain.targetId) ?? [];
  const children: CallTreeNode[] = [];

  for (const ownChain of ownChains) {
    const child = buildTreeFromChain(ownChain, workflowMap, chainMap, pathVisited);
    if (child) children.push(child);
  }

  pathVisited.delete(chain.targetId);

  for (const nextChain of chain.next) {
    const nextChild = buildTreeFromChain(nextChain, workflowMap, chainMap, pathVisited);
    if (nextChild) children.push(nextChild);
  }

  return {
    workflowId: chain.targetId,
    workflow,
    connectionType: chain.connectionType,
    children,
  };
}

function buildTree(
  workflowId: string,
  workflowMap: Map<string, WorkflowDetail>,
  chainMap: Map<string, CallChainNode[]>,
  pathVisited: Set<string>,
): CallTreeNode | null {
  const workflow = workflowMap.get(workflowId);
  if (!workflow) return null;
  if (pathVisited.has(workflowId)) return null;

  pathVisited.add(workflowId);

  const chains = chainMap.get(workflowId) ?? [];
  const children: CallTreeNode[] = [];

  for (const chain of chains) {
    const child = buildTreeFromChain(chain, workflowMap, chainMap, pathVisited);
    if (child) children.push(child);
  }

  pathVisited.delete(workflowId);

  return { workflowId, workflow, connectionType: 'sub-workflow', children };
}

function measureSubtreeHeight(node: CallTreeNode): number {
  if (node.children.length === 0) return CARD_HEIGHT;

  let totalHeight = 0;
  for (const [i, child] of node.children.entries()) {
    if (i > 0) totalHeight += SIBLING_GAP;
    totalHeight += measureSubtreeHeight(child);
  }
  return totalHeight;
}

function positionNode(
  node: CallTreeNode,
  depth: number,
  topOffset: number,
  subtreeHeight: number,
): LayoutNode {
  const x = depth * (CARD_WIDTH + LEVEL_GAP);

  if (node.children.length === 0) {
    const y = topOffset + (subtreeHeight - CARD_HEIGHT) / 2;
    return {
      workflowId: node.workflowId,
      workflow: node.workflow,
      connectionType: node.connectionType,
      children: [],
      x,
      y,
    };
  }

  const layoutChildren: LayoutNode[] = [];
  let currentY = topOffset;

  for (const childNode of node.children) {
    const childHeight = measureSubtreeHeight(childNode);
    const child = positionNode(childNode, depth + 1, currentY, childHeight);
    layoutChildren.push(child);
    currentY += childHeight + SIBLING_GAP;
  }

  const firstChild = layoutChildren[0];
  const lastChild = layoutChildren[layoutChildren.length - 1];
  const y =
    firstChild && lastChild
      ? (firstChild.y + lastChild.y + CARD_HEIGHT) / 2 - CARD_HEIGHT / 2
      : topOffset;

  return {
    workflowId: node.workflowId,
    workflow: node.workflow,
    connectionType: node.connectionType,
    children: layoutChildren,
    x,
    y,
  };
}

function collectEdges(node: LayoutNode, edges: LayoutEdge[]): void {
  for (const child of node.children) {
    edges.push({
      fromX: node.x + CARD_WIDTH,
      fromY: node.y + CARD_HEIGHT / 2,
      toX: child.x,
      toY: child.y + CARD_HEIGHT / 2,
      type: child.connectionType,
    });
    collectEdges(child, edges);
  }
}

function collectNodeIds(node: CallTreeNode, ids: Set<string>): void {
  ids.add(node.workflowId);
  for (const child of node.children) {
    collectNodeIds(child, ids);
  }
}

export function buildCallGraph(workflows: Map<string, WorkflowDetail>): GraphLayout {
  const toolIndex = buildMcpToolIndex(workflows);
  const chainMap = new Map<string, CallChainNode[]>();
  const calledSet = new Set<string>();

  for (const [id, workflow] of workflows) {
    const ewChains = extractCallChains(workflow);
    const mcpTargetIds = extractMcpTargetIds(workflow, toolIndex);
    const mcpChains: CallChainNode[] = mcpTargetIds.map((targetId) => ({
      targetId,
      connectionType: 'mcp' as const,
      next: [],
    }));
    const allChains = [...ewChains, ...mcpChains];
    chainMap.set(id, allChains);
    collectChainTargetIds(allChains, calledSet);
  }

  const rootWorkflows = [...workflows.values()]
    .filter((w) => hasEntryTrigger(w) || !calledSet.has(w.id))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  log.debug(`${workflows.size} workflows, ${rootWorkflows.length} roots, ${calledSet.size} called`);

  const connectedTrees: CallTreeNode[] = [];
  const standaloneTrees: CallTreeNode[] = [];

  for (const rootWorkflow of rootWorkflows) {
    const tree = buildTree(rootWorkflow.id, workflows, chainMap, new Set());
    if (!tree) continue;
    if (tree.children.length > 0) {
      connectedTrees.push(tree);
    } else {
      standaloneTrees.push(tree);
    }
  }

  const showLabels = connectedTrees.length > 0 && standaloneTrees.length > 0;

  const roots: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let cumulativeY = showLabels ? LABEL_HEIGHT : 0;

  for (const tree of connectedTrees) {
    const subtreeHeight = measureSubtreeHeight(tree);
    const layoutNode = positionNode(tree, 0, cumulativeY, subtreeHeight);
    roots.push(layoutNode);
    collectEdges(layoutNode, edges);
    cumulativeY += subtreeHeight + TREE_GAP;
  }

  const standalone: LayoutNode[] = [];
  const standaloneStartY = showLabels ? cumulativeY + SECTION_GAP + LABEL_HEIGHT : cumulativeY;

  for (const [i, tree] of standaloneTrees.entries()) {
    const col = i % STANDALONE_COLUMNS;
    const row = Math.floor(i / STANDALONE_COLUMNS);
    const x = col * (CARD_WIDTH + STANDALONE_GAP_X);
    const y = standaloneStartY + row * (CARD_HEIGHT + STANDALONE_GAP_Y);
    standalone.push({
      workflowId: tree.workflowId,
      workflow: tree.workflow,
      connectionType: 'sub-workflow',
      children: [],
      x,
      y,
    });
  }

  const coveredIds = new Set<string>();
  for (const root of roots) {
    collectNodeIds(root as CallTreeNode, coveredIds);
  }
  for (const node of standalone) {
    coveredIds.add(node.workflowId);
  }

  const uncoveredIds = [...workflows.keys()].filter((id) => !coveredIds.has(id));
  if (uncoveredIds.length > 0) {
    log.debug(`Uncovered workflows: ${uncoveredIds.join(', ')}`);
  }

  log.debug(
    `Graph built: ${roots.length} connected, ${standalone.length} standalone, ${edges.length} edges`,
  );

  return { roots, standalone, edges, uncoveredIds };
}

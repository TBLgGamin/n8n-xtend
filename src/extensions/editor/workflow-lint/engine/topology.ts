import type {
  Branch,
  ConnectionMap,
  ConnectionTarget,
  GraphNode,
  LintableNode,
  NodeRole,
  Section,
  TopologyResult,
} from './types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

interface AdjacencyResult {
  mainOutgoing: Map<string, string[]>;
  mainIncoming: Map<string, string[]>;
  subNodeParents: Map<string, string>;
}

function initNodeMaps(nodes: LintableNode[]): AdjacencyResult {
  const mainOutgoing = new Map<string, string[]>();
  const mainIncoming = new Map<string, string[]>();

  for (const node of nodes) {
    if (node.type !== STICKY_NOTE_TYPE) {
      mainOutgoing.set(node.name, []);
      mainIncoming.set(node.name, []);
    }
  }

  return { mainOutgoing, mainIncoming, subNodeParents: new Map() };
}

function addMainConnection(
  sourceName: string,
  target: ConnectionTarget,
  mainOutgoing: Map<string, string[]>,
  mainIncoming: Map<string, string[]>,
): void {
  const outgoing = mainOutgoing.get(sourceName);
  if (outgoing && !outgoing.includes(target.node)) outgoing.push(target.node);
  const incoming = mainIncoming.get(target.node);
  if (incoming && !incoming.includes(sourceName)) incoming.push(sourceName);
}

function processTargets(
  targets: ConnectionTarget[],
  sourceName: string,
  connectionType: string,
  adjacency: AdjacencyResult,
): void {
  for (const target of targets) {
    if (connectionType === 'main') {
      addMainConnection(sourceName, target, adjacency.mainOutgoing, adjacency.mainIncoming);
    } else {
      adjacency.subNodeParents.set(sourceName, target.node);
    }
  }
}

function buildAdjacency(nodes: LintableNode[], connections: ConnectionMap): AdjacencyResult {
  const adjacency = initNodeMaps(nodes);

  for (const [sourceName, outputs] of Object.entries(connections)) {
    for (const [connectionType, slots] of Object.entries(outputs)) {
      if (!slots) continue;
      for (const targets of slots) {
        if (targets) processTargets(targets, sourceName, connectionType, adjacency);
      }
    }
  }

  return adjacency;
}

function isTriggerNodeType(type: string, triggerTypes: string[]): boolean {
  if (triggerTypes.length > 0 && triggerTypes.includes(type)) return true;
  return type.toLowerCase().includes('trigger');
}

function assignRole(
  name: string,
  nodeType: string,
  mainIncoming: Map<string, string[]>,
  mainOutgoing: Map<string, string[]>,
  subNodeParents: Map<string, string>,
  triggerTypes: string[],
): NodeRole {
  if (subNodeParents.has(name)) return 'regular';
  const inCount = mainIncoming.get(name)?.length ?? 0;
  const outCount = mainOutgoing.get(name)?.length ?? 0;
  if (inCount === 0) return isTriggerNodeType(nodeType, triggerTypes) ? 'trigger' : 'regular';
  if (outCount === 0) return 'terminal';
  if (outCount > 1) return 'branch-point';
  if (inCount > 1) return 'merge-point';
  return 'regular';
}

function initKahnQueue(
  mainIncoming: Map<string, string[]>,
  subNodeParents: Map<string, string>,
): { depths: Map<string, number>; inDegree: Map<string, number>; queue: string[] } {
  const depths = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const queue: string[] = [];

  for (const [name, incoming] of mainIncoming) {
    if (subNodeParents.has(name)) continue;
    inDegree.set(name, incoming.length);
    if (incoming.length === 0) {
      queue.push(name);
      depths.set(name, 0);
    }
  }

  return { depths, inDegree, queue };
}

function updateNeighborDepth(
  neighbor: string,
  newDepth: number,
  depths: Map<string, number>,
  inDegree: Map<string, number>,
  queue: string[],
): void {
  const existingDepth = depths.get(neighbor);
  if (existingDepth === undefined || newDepth > existingDepth) {
    depths.set(neighbor, newDepth);
  }
  const remaining = (inDegree.get(neighbor) ?? 0) - 1;
  inDegree.set(neighbor, remaining);
  if (remaining === 0) queue.push(neighbor);
}

function processKahnQueue(
  depths: Map<string, number>,
  inDegree: Map<string, number>,
  queue: string[],
  mainOutgoing: Map<string, string[]>,
  subNodeParents: Map<string, string>,
): number {
  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    processed++;
    const currentDepth = depths.get(current) ?? 0;
    for (const neighbor of mainOutgoing.get(current) ?? []) {
      if (!subNodeParents.has(neighbor)) {
        updateNeighborDepth(neighbor, currentDepth + 1, depths, inDegree, queue);
      }
    }
  }
  return processed;
}

function assignCycleDepths(
  depths: Map<string, number>,
  nonSubNodes: string[],
  mainIncoming: Map<string, string[]>,
): void {
  for (const name of nonSubNodes) {
    if (depths.has(name)) continue;
    let best = 0;
    for (const pred of mainIncoming.get(name) ?? []) {
      const d = depths.get(pred);
      if (d !== undefined) best = Math.max(best, d + 1);
    }
    depths.set(name, best);
  }
}

function computeDepths(
  mainOutgoing: Map<string, string[]>,
  mainIncoming: Map<string, string[]>,
  subNodeParents: Map<string, string>,
): { depths: Map<string, number>; hasCycles: boolean } {
  const { depths, inDegree, queue } = initKahnQueue(mainIncoming, subNodeParents);
  const processed = processKahnQueue(depths, inDegree, queue, mainOutgoing, subNodeParents);
  const nonSubNodes = [...mainIncoming.keys()].filter((n) => !subNodeParents.has(n));
  const hasCycles = processed < nonSubNodes.length;
  if (hasCycles) assignCycleDepths(depths, nonSubNodes, mainIncoming);
  return { depths, hasCycles };
}

function collectSubNodesForParents(
  subNodeParents: Map<string, string>,
  parentNames: string[],
): string[] {
  const parentSet = new Set(parentNames);
  return [...subNodeParents.entries()]
    .filter(([, parent]) => parentSet.has(parent))
    .map(([sub]) => sub);
}

function expandBfsNeighbors(
  current: string,
  neighbors: Map<string, string[]>,
  subNodeParents: Map<string, string>,
  visited: Set<string>,
  bfsQueue: string[],
): void {
  for (const neighbor of neighbors.get(current) ?? []) {
    if (!visited.has(neighbor) && !subNodeParents.has(neighbor)) {
      visited.add(neighbor);
      bfsQueue.push(neighbor);
    }
  }
}

function bfsFromTrigger(
  trigger: string,
  mainOutgoing: Map<string, string[]>,
  mainIncoming: Map<string, string[]>,
  subNodeParents: Map<string, string>,
  visited: Set<string>,
): string[] {
  const sectionNodes: string[] = [];
  const bfsQueue = [trigger];
  visited.add(trigger);

  while (bfsQueue.length > 0) {
    const current = bfsQueue.shift() ?? '';
    sectionNodes.push(current);
    expandBfsNeighbors(current, mainOutgoing, subNodeParents, visited, bfsQueue);
    expandBfsNeighbors(current, mainIncoming, subNodeParents, visited, bfsQueue);
  }

  return sectionNodes;
}

function detectSections(
  nodeNames: string[],
  mainOutgoing: Map<string, string[]>,
  mainIncoming: Map<string, string[]>,
  subNodeParents: Map<string, string>,
  depths: Map<string, number>,
): { sections: Section[]; disconnected: string[] } {
  const visited = new Set<string>();
  const sections: Section[] = [];
  const nonSubNodes = nodeNames.filter((n) => !subNodeParents.has(n));
  const triggers = nonSubNodes.filter((n) => (mainIncoming.get(n)?.length ?? 0) === 0);

  for (const trigger of triggers) {
    if (visited.has(trigger)) continue;
    const sectionNodes = bfsFromTrigger(
      trigger,
      mainOutgoing,
      mainIncoming,
      subNodeParents,
      visited,
    );
    sectionNodes.sort((a, b) => (depths.get(a) ?? 0) - (depths.get(b) ?? 0));
    sections.push({
      id: sections.length,
      name: sectionNodes[0] ?? '',
      triggerName: trigger,
      nodeNames: sectionNodes,
      subNodeNames: collectSubNodesForParents(subNodeParents, sectionNodes),
      branches: [],
    });
  }

  const disconnected = nonSubNodes.filter((n) => !visited.has(n));
  if (disconnected.length > 0) {
    sections.push({
      id: sections.length,
      name: 'Disconnected',
      triggerName: null,
      nodeNames: disconnected,
      subNodeNames: collectSubNodesForParents(subNodeParents, disconnected),
      branches: [],
    });
  }

  return { sections, disconnected };
}

function traceBranch(
  start: string,
  sectionSet: Set<string>,
  assigned: Set<string>,
  mainOutgoing: Map<string, string[]>,
): string[] {
  const branchNodes: string[] = [];
  let current: string | null = start;
  while (current && !assigned.has(current) && sectionSet.has(current)) {
    branchNodes.push(current);
    assigned.add(current);
    const next: string[] = mainOutgoing.get(current) ?? [];
    current = next.length === 1 ? (next[0] ?? null) : null;
  }
  return branchNodes;
}

function traceReverseBranch(
  start: string,
  sectionSet: Set<string>,
  assigned: Set<string>,
  mainIncoming: Map<string, string[]>,
): string[] {
  const branchNodes: string[] = [];
  let current: string | null = start;
  while (current && !assigned.has(current) && sectionSet.has(current)) {
    branchNodes.push(current);
    assigned.add(current);
    const prev: string[] = (mainIncoming.get(current) ?? []).filter(
      (n) => !assigned.has(n) && sectionSet.has(n),
    );
    current = prev.length === 1 ? (prev[0] ?? null) : null;
  }
  return branchNodes;
}

function expandDfsEntry(
  entry: { node: string; path: string[] },
  mainOutgoing: Map<string, string[]>,
  sectionSet: Set<string>,
  visited: Set<string>,
  stack: Array<{ node: string; path: string[] }>,
): void {
  visited.add(entry.node);
  for (const next of mainOutgoing.get(entry.node) ?? []) {
    if (sectionSet.has(next) && !visited.has(next)) {
      stack.push({ node: next, path: [...entry.path, next] });
    }
  }
}

function findLongestPath(section: Section, mainOutgoing: Map<string, string[]>): string[] {
  const sectionSet = new Set(section.nodeNames);
  const terminalSet = new Set(
    section.nodeNames.filter(
      (n) => (mainOutgoing.get(n) ?? []).filter((t) => sectionSet.has(t)).length === 0,
    ),
  );

  const start = section.triggerName ?? section.nodeNames[0];
  if (!start) return [];

  let longestPath: string[] = [];
  const stack: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) break;
    if (terminalSet.has(entry.node) && entry.path.length > longestPath.length)
      longestPath = entry.path;
    expandDfsEntry(entry, mainOutgoing, sectionSet, visited, stack);
  }

  return longestPath.length > 0 ? longestPath : [start];
}

function collectBranchPointBranches(
  branchPoints: string[],
  sectionSet: Set<string>,
  assigned: Set<string>,
  mainOutgoing: Map<string, string[]>,
): Branch[] {
  const branches: Branch[] = [];
  let slotCounter = assigned.size > 0 ? 1 : 0;

  for (const bp of branchPoints) {
    for (const target of mainOutgoing.get(bp) ?? []) {
      if (assigned.has(target)) continue;
      const branchNodes = traceBranch(target, sectionSet, assigned, mainOutgoing);
      if (branchNodes.length > 0) {
        branches.push({ nodeNames: branchNodes, slot: slotCounter });
        slotCounter++;
      }
    }
  }

  return branches;
}

function collectMergePointBranches(
  mergePoints: string[],
  sectionSet: Set<string>,
  assigned: Set<string>,
  mainIncoming: Map<string, string[]>,
  startSlot: number,
): Branch[] {
  const branches: Branch[] = [];
  let slotCounter = startSlot;

  for (const mp of mergePoints) {
    for (const incoming of mainIncoming.get(mp) ?? []) {
      if (assigned.has(incoming)) continue;
      const reverseBranch = traceReverseBranch(incoming, sectionSet, assigned, mainIncoming);
      if (reverseBranch.length > 0) {
        branches.push({ nodeNames: reverseBranch, slot: slotCounter });
        slotCounter++;
      }
    }
  }

  return branches;
}

function detectBranches(
  section: Section,
  mainOutgoing: Map<string, string[]>,
  mainIncoming: Map<string, string[]>,
): Branch[] {
  const branchPoints = section.nodeNames.filter((n) => (mainOutgoing.get(n)?.length ?? 0) > 1);
  const mergePoints = section.nodeNames.filter((n) => (mainIncoming.get(n)?.length ?? 0) > 1);

  if (branchPoints.length === 0 && mergePoints.length === 0) {
    return [{ nodeNames: [...section.nodeNames], slot: 0 }];
  }

  const sectionSet = new Set(section.nodeNames);
  const assigned = new Set<string>();
  const branches: Branch[] = [];

  const mainSpine = findLongestPath(section, mainOutgoing);
  if (mainSpine.length > 0) {
    branches.push({ nodeNames: mainSpine, slot: 0 });
    for (const n of mainSpine) assigned.add(n);
  }

  branches.push(...collectBranchPointBranches(branchPoints, sectionSet, assigned, mainOutgoing));
  branches.push(
    ...collectMergePointBranches(mergePoints, sectionSet, assigned, mainIncoming, branches.length),
  );

  let slotCounter = branches.length;
  for (const name of section.nodeNames) {
    if (!assigned.has(name)) {
      branches.push({ nodeNames: [name], slot: slotCounter });
      slotCounter++;
    }
  }

  return branches;
}

function buildGraphNode(
  node: LintableNode,
  sections: Section[],
  adjacency: AdjacencyResult,
  depths: Map<string, number>,
  triggerTypes: string[],
): GraphNode {
  const sectionId =
    sections.find((s) => s.nodeNames.includes(node.name) || s.subNodeNames.includes(node.name))
      ?.id ?? 0;

  const subNodes = [...adjacency.subNodeParents.entries()]
    .filter(([, parent]) => parent === node.name)
    .map(([sub]) => sub);

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    role: assignRole(
      node.name,
      node.type,
      adjacency.mainIncoming,
      adjacency.mainOutgoing,
      adjacency.subNodeParents,
      triggerTypes,
    ),
    incomingMain: adjacency.mainIncoming.get(node.name) ?? [],
    outgoingMain: adjacency.mainOutgoing.get(node.name) ?? [],
    subNodeParent: adjacency.subNodeParents.get(node.name) ?? null,
    subNodes,
    depth: depths.get(node.name) ?? 0,
    sectionId,
  };
}

export function analyzeTopology(
  nodes: LintableNode[],
  connections: ConnectionMap,
  triggerTypes: string[] = [],
): TopologyResult {
  const filteredNodes = nodes.filter((n) => n.type !== STICKY_NOTE_TYPE);
  if (filteredNodes.length === 0) {
    return { nodes: new Map(), sections: [], disconnected: [], hasCycles: false };
  }

  const adjacency = buildAdjacency(filteredNodes, connections);
  const nodeNames = filteredNodes.map((n) => n.name);
  const { depths, hasCycles } = computeDepths(
    adjacency.mainOutgoing,
    adjacency.mainIncoming,
    adjacency.subNodeParents,
  );
  const { sections, disconnected } = detectSections(
    nodeNames,
    adjacency.mainOutgoing,
    adjacency.mainIncoming,
    adjacency.subNodeParents,
    depths,
  );

  for (const section of sections) {
    section.branches = detectBranches(section, adjacency.mainOutgoing, adjacency.mainIncoming);
  }

  const graphNodes = new Map<string, GraphNode>();
  for (const node of filteredNodes) {
    graphNodes.set(node.name, buildGraphNode(node, sections, adjacency, depths, triggerTypes));
  }

  return { nodes: graphNodes, sections, disconnected, hasCycles };
}

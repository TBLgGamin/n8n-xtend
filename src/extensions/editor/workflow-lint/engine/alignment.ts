import type {
  AlignmentConfig,
  ConnectionMap,
  GraphNode,
  LintableNode,
  TopologyResult,
} from './types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

function buildPositionMap(nodes: LintableNode[]): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  for (const node of nodes) {
    if (node.type !== STICKY_NOTE_TYPE) {
      map.set(node.name, [...node.position]);
    }
  }
  return map;
}

function straightenConnections(
  positionMap: Map<string, [number, number]>,
  topology: TopologyResult,
): void {
  const sortedNodes = [...topology.nodes.values()]
    .filter((n) => n.incomingMain.length === 1 && n.outgoingMain.length === 1)
    .sort((a, b) => a.depth - b.depth);

  for (const graphNode of sortedNodes) {
    const predName = graphNode.incomingMain[0];
    if (!predName) continue;

    const predPos = positionMap.get(predName);
    const currentPos = positionMap.get(graphNode.name);
    if (!predPos || !currentPos) continue;

    positionMap.set(graphNode.name, [currentPos[0], predPos[1]]);
  }
}

function computeMergeY(
  graphNode: GraphNode,
  positionMap: Map<string, [number, number]>,
): number | null {
  const incomingYs = graphNode.incomingMain
    .map((name) => positionMap.get(name)?.[1])
    .filter((y): y is number => y !== undefined);

  if (incomingYs.length === 0) return null;
  return Math.round(incomingYs.reduce((a, b) => a + b, 0) / incomingYs.length);
}

function propagateDownstream(
  startName: string,
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
): void {
  let current = startName;
  while (true) {
    const node = topology.nodes.get(current);
    if (!node || node.outgoingMain.length !== 1) break;

    const next = node.outgoingMain[0];
    if (!next) break;
    const nextNode = topology.nodes.get(next);
    if (!nextNode || nextNode.incomingMain.length !== 1) break;

    const nextPos = positionMap.get(next);
    const prevPos = positionMap.get(current);
    if (!nextPos || !prevPos) break;

    positionMap.set(next, [nextPos[0], prevPos[1]]);
    current = next;
  }
}

function centerBranches(
  positionMap: Map<string, [number, number]>,
  topology: TopologyResult,
): void {
  for (const [, graphNode] of topology.nodes) {
    if (graphNode.role !== 'merge-point' || graphNode.incomingMain.length < 2) continue;

    const avgY = computeMergeY(graphNode, positionMap);
    const currentPos = positionMap.get(graphNode.name);
    if (avgY === null || !currentPos) continue;

    positionMap.set(graphNode.name, [currentPos[0], avgY]);
    propagateDownstream(graphNode.name, topology, positionMap);
  }
}

export function applyAlignment(
  nodes: LintableNode[],
  _connections: ConnectionMap,
  topology: TopologyResult,
  config: AlignmentConfig,
): LintableNode[] {
  if (!config.enabled) return nodes;

  const positionMap = buildPositionMap(nodes);

  if (config.straightenConnections) {
    straightenConnections(positionMap, topology);
  }

  if (config.centerBranches) {
    centerBranches(positionMap, topology);
  }

  return nodes.map((node) => {
    if (node.type === STICKY_NOTE_TYPE) return node;
    const newPos = positionMap.get(node.name);
    if (!newPos) return node;
    return { ...node, position: newPos };
  });
}

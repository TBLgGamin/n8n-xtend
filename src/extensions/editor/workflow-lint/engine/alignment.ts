import { buildPositionMap, snapToGrid } from './shared';
import { STICKY_NOTE_TYPE } from './types';
import type {
  AlignmentConfig,
  ConnectionMap,
  GraphNode,
  LayoutConfig,
  LintableNode,
  TopologyResult,
} from './types';

function straightenConnections(
  positionMap: Map<string, [number, number]>,
  topology: TopologyResult,
  crossIdx: 0 | 1,
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

    const aligned: [number, number] = [...currentPos];
    aligned[crossIdx] = predPos[crossIdx];
    positionMap.set(graphNode.name, aligned);
  }
}

function computeMergeCrossValue(
  graphNode: GraphNode,
  positionMap: Map<string, [number, number]>,
  crossIdx: 0 | 1,
): number | null {
  const incomingValues = graphNode.incomingMain
    .map((name) => positionMap.get(name)?.[crossIdx])
    .filter((v): v is number => v !== undefined);

  if (incomingValues.length === 0) return null;
  return Math.round(incomingValues.reduce((a, b) => a + b, 0) / incomingValues.length);
}

function propagateDownstream(
  startName: string,
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  crossIdx: 0 | 1,
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

    const aligned: [number, number] = [...nextPos];
    aligned[crossIdx] = prevPos[crossIdx];
    positionMap.set(next, aligned);
    current = next;
  }
}

function centerBranches(
  positionMap: Map<string, [number, number]>,
  topology: TopologyResult,
  crossIdx: 0 | 1,
): void {
  for (const [, graphNode] of topology.nodes) {
    if (graphNode.role !== 'merge-point' || graphNode.incomingMain.length < 2) continue;

    const avgCross = computeMergeCrossValue(graphNode, positionMap, crossIdx);
    const currentPos = positionMap.get(graphNode.name);
    if (avgCross === null || !currentPos) continue;

    const aligned: [number, number] = [...currentPos];
    aligned[crossIdx] = avgCross;
    positionMap.set(graphNode.name, aligned);
    propagateDownstream(graphNode.name, topology, positionMap, crossIdx);
  }
}

function snapPositionsToGrid(
  positionMap: Map<string, [number, number]>,
  layoutConfig: LayoutConfig,
): void {
  if (!layoutConfig.snapToGrid) return;
  for (const [name, pos] of positionMap) {
    positionMap.set(name, [
      snapToGrid(pos[0], layoutConfig.gridSize),
      snapToGrid(pos[1], layoutConfig.gridSize),
    ]);
  }
}

export function applyAlignment(
  nodes: LintableNode[],
  _connections: ConnectionMap,
  topology: TopologyResult,
  config: AlignmentConfig,
  layoutConfig: LayoutConfig,
): LintableNode[] {
  if (!config.enabled) return nodes;

  const crossIdx: 0 | 1 = layoutConfig.direction === 'vertical' ? 0 : 1;
  const positionMap = buildPositionMap(nodes);

  if (config.straightenConnections) {
    straightenConnections(positionMap, topology, crossIdx);
  }

  if (config.centerBranches) {
    centerBranches(positionMap, topology, crossIdx);
  }

  snapPositionsToGrid(positionMap, layoutConfig);

  return nodes.map((node) => {
    if (node.type === STICKY_NOTE_TYPE) return node;
    const newPos = positionMap.get(node.name);
    if (!newPos) return node;
    return { ...node, position: newPos };
  });
}

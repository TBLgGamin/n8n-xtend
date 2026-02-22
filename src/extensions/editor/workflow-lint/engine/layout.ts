import { getNodeSize } from './node-sizes';
import type { LayoutConfig, LintableNode, NodeSizeMap, Section, TopologyResult } from './types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const FALLBACK_MIN_GAP = 80;

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function applySnap(x: number, y: number, config: LayoutConfig): [number, number] {
  if (!config.snapToGrid) return [x, y];
  return [snapToGrid(x, config.gridSize), snapToGrid(y, config.gridSize)];
}

function buildBranchSlotMap(section: Section): Map<string, number> {
  const branchSlots = new Map<string, number>();
  for (const branch of section.branches) {
    for (const nodeName of branch.nodeNames) {
      branchSlots.set(nodeName, branch.slot);
    }
  }
  return branchSlots;
}

function positionMainNodes(
  section: Section,
  topology: TopologyResult,
  config: LayoutConfig,
  sectionOffset: number,
  positionMap: Map<string, [number, number]>,
): void {
  const branchSlots = buildBranchSlotMap(section);
  const isVertical = config.direction === 'vertical';

  for (const nodeName of section.nodeNames) {
    const graphNode = topology.nodes.get(nodeName);
    if (!graphNode) continue;

    let mainAxis = graphNode.depth * config.nodeSpacing;
    let crossAxis = sectionOffset + (branchSlots.get(nodeName) ?? 0) * config.branchSpacing;
    if (isVertical) [mainAxis, crossAxis] = [crossAxis, mainAxis];

    positionMap.set(nodeName, applySnap(mainAxis, crossAxis, config));
  }
}

function computeSubNodePosition(
  siblingIndex: number,
  siblingCount: number,
  parentPos: [number, number],
  config: LayoutConfig,
): [number, number] {
  const totalWidth = (siblingCount - 1) * config.subNodeSpacing;
  const startX = parentPos[0] - totalWidth / 2;

  if (config.direction === 'vertical') {
    return [
      parentPos[0] + config.subNodeOffset,
      parentPos[1] - totalWidth / 2 + siblingIndex * config.subNodeSpacing,
    ];
  }

  return [startX + siblingIndex * config.subNodeSpacing, parentPos[1] + config.subNodeOffset];
}

function positionSubNodes(
  section: Section,
  topology: TopologyResult,
  config: LayoutConfig,
  positionMap: Map<string, [number, number]>,
): void {
  for (const subNodeName of section.subNodeNames) {
    const graphNode = topology.nodes.get(subNodeName);
    if (!graphNode?.subNodeParent) continue;

    const parentPos = positionMap.get(graphNode.subNodeParent);
    const parentGraphNode = topology.nodes.get(graphNode.subNodeParent);
    if (!parentPos || !parentGraphNode) continue;

    const siblingIndex = parentGraphNode.subNodes.indexOf(subNodeName);
    const [subX, subY] = computeSubNodePosition(
      siblingIndex,
      parentGraphNode.subNodes.length,
      parentPos,
      config,
    );
    positionMap.set(subNodeName, applySnap(subX, subY, config));
  }
}

function computeSectionEnd(
  section: Section,
  positionMap: Map<string, [number, number]>,
  isVertical: boolean,
): number {
  const allNames = [...section.nodeNames, ...section.subNodeNames];
  const allPositions = allNames
    .map((n) => positionMap.get(n))
    .filter((p): p is [number, number] => p !== undefined);

  if (allPositions.length === 0) return 0;

  return isVertical
    ? Math.max(...allPositions.map((p) => p[0]))
    : Math.max(...allPositions.map((p) => p[1]));
}

function getClusterMainAxisRange(
  nodeName: string,
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  mainIdx: 0 | 1,
  nodeSizes: NodeSizeMap,
): [number, number] | null {
  const pos = positionMap.get(nodeName);
  if (!pos) return null;

  const nodeW = getNodeSize(nodeName, nodeSizes).width;
  let min = pos[mainIdx];
  let max = pos[mainIdx] + nodeW;

  const graphNode = topology.nodes.get(nodeName);
  if (graphNode) {
    for (const subName of graphNode.subNodes) {
      const subPos = positionMap.get(subName);
      if (!subPos) continue;
      const subW = getNodeSize(subName, nodeSizes).width;
      min = Math.min(min, subPos[mainIdx]);
      max = Math.max(max, subPos[mainIdx] + subW);
    }
  }

  return [min, max];
}

function shiftNodeCluster(
  nodeName: string,
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  mainIdx: 0 | 1,
  shift: number,
): void {
  const pos = positionMap.get(nodeName);
  if (pos) {
    const updated: [number, number] = [...pos];
    updated[mainIdx] += shift;
    positionMap.set(nodeName, updated);
  }

  const graphNode = topology.nodes.get(nodeName);
  if (!graphNode) return;

  for (const subName of graphNode.subNodes) {
    const subPos = positionMap.get(subName);
    if (!subPos) continue;
    const updated: [number, number] = [...subPos];
    updated[mainIdx] += shift;
    positionMap.set(subName, updated);
  }
}

function groupNodesByDepth(section: Section, topology: TopologyResult): Map<number, string[]> {
  const nodesByDepth = new Map<number, string[]>();
  for (const nodeName of section.nodeNames) {
    const graphNode = topology.nodes.get(nodeName);
    if (!graphNode) continue;
    const list = nodesByDepth.get(graphNode.depth) ?? [];
    list.push(nodeName);
    nodesByDepth.set(graphNode.depth, list);
  }
  return nodesByDepth;
}

function computeDepthRightEdge(
  nodeNames: string[],
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  mainIdx: 0 | 1,
  nodeSizes: NodeSizeMap,
): number {
  let maxRight = Number.NEGATIVE_INFINITY;
  for (const nodeName of nodeNames) {
    const range = getClusterMainAxisRange(nodeName, topology, positionMap, mainIdx, nodeSizes);
    if (range) maxRight = Math.max(maxRight, range[1]);
  }
  return maxRight;
}

function computeDepthLeftEdge(
  nodeNames: string[],
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  mainIdx: 0 | 1,
  nodeSizes: NodeSizeMap,
): number {
  let minLeft = Number.POSITIVE_INFINITY;
  for (const nodeName of nodeNames) {
    const range = getClusterMainAxisRange(nodeName, topology, positionMap, mainIdx, nodeSizes);
    if (range) minLeft = Math.min(minLeft, range[0]);
  }
  return minLeft;
}

function shiftDownstreamDepths(
  sortedDepths: number[],
  fromIndex: number,
  shift: number,
  nodesByDepth: Map<number, string[]>,
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  mainIdx: 0 | 1,
): void {
  for (let j = fromIndex; j < sortedDepths.length; j++) {
    const depth = sortedDepths[j];
    if (depth === undefined) continue;
    for (const nodeName of nodesByDepth.get(depth) ?? []) {
      shiftNodeCluster(nodeName, topology, positionMap, mainIdx, shift);
    }
  }
}

function computeOverlapShift(gap: number, minGap: number, config: LayoutConfig): number {
  const rawShift = minGap - gap;
  return config.snapToGrid ? Math.ceil(rawShift / config.gridSize) * config.gridSize : rawShift;
}

function computeMaxClusterWidth(
  nodeNames: string[],
  topology: TopologyResult,
  positionMap: Map<string, [number, number]>,
  mainIdx: 0 | 1,
  nodeSizes: NodeSizeMap,
): number {
  let maxW = 0;
  for (const name of nodeNames) {
    const range = getClusterMainAxisRange(name, topology, positionMap, mainIdx, nodeSizes);
    if (!range) continue;
    maxW = Math.max(maxW, range[1] - range[0]);
  }
  return maxW;
}

function adjustForSubNodeOverlaps(
  section: Section,
  topology: TopologyResult,
  config: LayoutConfig,
  positionMap: Map<string, [number, number]>,
  nodeSizes: NodeSizeMap,
): void {
  const mainIdx: 0 | 1 = config.direction === 'vertical' ? 1 : 0;
  const nodesByDepth = groupNodesByDepth(section, topology);
  const sortedDepths = [...nodesByDepth.keys()].sort((a, b) => a - b);
  if (sortedDepths.length <= 1) return;

  for (let i = 0; i < sortedDepths.length - 1; i++) {
    const currentDepth = sortedDepths[i];
    const nextDepth = sortedDepths[i + 1];
    if (currentDepth === undefined || nextDepth === undefined) continue;

    const currentNodes = nodesByDepth.get(currentDepth) ?? [];
    const nextNodes = nodesByDepth.get(nextDepth) ?? [];
    const maxRight = computeDepthRightEdge(currentNodes, topology, positionMap, mainIdx, nodeSizes);
    const minLeft = computeDepthLeftEdge(nextNodes, topology, positionMap, mainIdx, nodeSizes);

    if (maxRight === Number.NEGATIVE_INFINITY || minLeft === Number.POSITIVE_INFINITY) continue;

    const widestCluster = computeMaxClusterWidth(
      currentNodes,
      topology,
      positionMap,
      mainIdx,
      nodeSizes,
    );
    const minGap = Math.max(FALLBACK_MIN_GAP, config.nodeSpacing - widestCluster);

    const gap = minLeft - maxRight;
    if (gap >= minGap) continue;

    const shift = computeOverlapShift(gap, minGap, config);
    shiftDownstreamDepths(sortedDepths, i + 1, shift, nodesByDepth, topology, positionMap, mainIdx);
  }
}

export function applyLayout(
  nodes: LintableNode[],
  topology: TopologyResult,
  config: LayoutConfig,
  nodeSizes: NodeSizeMap,
): LintableNode[] {
  if (!config.enabled) return nodes;

  const positionMap = new Map<string, [number, number]>();
  let sectionOffset = 0;

  for (const section of topology.sections) {
    positionMainNodes(section, topology, config, sectionOffset, positionMap);
    positionSubNodes(section, topology, config, positionMap);
    adjustForSubNodeOverlaps(section, topology, config, positionMap, nodeSizes);

    const hasNodes = section.nodeNames.length + section.subNodeNames.length > 0;
    if (hasNodes) {
      sectionOffset =
        computeSectionEnd(section, positionMap, config.direction === 'vertical') +
        config.sectionGap;
    }
  }

  const excludeSet = new Set(config.excludeTypes);
  const pinSet = new Set(config.pinNodes);

  return nodes.map((node) => {
    if (node.type === STICKY_NOTE_TYPE) return node;
    if (excludeSet.has(node.type)) return node;
    if (pinSet.has(node.name)) return node;
    const newPosition = positionMap.get(node.name);
    if (!newPosition) return node;
    return { ...node, position: newPosition };
  });
}

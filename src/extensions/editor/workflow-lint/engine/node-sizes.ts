import type { LintableNode, NodeSize, NodeSizeMap } from './types';

export const DEFAULT_NODE_SIZE: NodeSize = { width: 200, height: 100 };

function computeMedianSize(sizes: NodeSize[]): NodeSize {
  if (sizes.length === 0) return DEFAULT_NODE_SIZE;

  const widths = sizes.map((s) => s.width).sort((a, b) => a - b);
  const heights = sizes.map((s) => s.height).sort((a, b) => a - b);

  const mid = Math.floor(widths.length / 2);
  const medianWidth =
    widths.length % 2 === 0
      ? Math.round(((widths[mid - 1] ?? 0) + (widths[mid] ?? 0)) / 2)
      : (widths[mid] ?? DEFAULT_NODE_SIZE.width);
  const medianHeight =
    heights.length % 2 === 0
      ? Math.round(((heights[mid - 1] ?? 0) + (heights[mid] ?? 0)) / 2)
      : (heights[mid] ?? DEFAULT_NODE_SIZE.height);

  return { width: medianWidth, height: medianHeight };
}

export function getNodeSize(name: string, sizes: NodeSizeMap): NodeSize {
  return sizes.get(name) ?? DEFAULT_NODE_SIZE;
}

export function buildNodeSizesByName(
  nodes: LintableNode[],
  sizesById: Map<string, NodeSize>,
): NodeSizeMap {
  const byName: NodeSizeMap = new Map();
  const measured: NodeSize[] = [];

  for (const node of nodes) {
    const size = sizesById.get(node.id);
    if (size) {
      byName.set(node.name, size);
      measured.push(size);
    }
  }

  if (measured.length > 0) {
    const estimated = computeMedianSize(measured);
    for (const node of nodes) {
      if (!byName.has(node.name)) {
        byName.set(node.name, estimated);
      }
    }
  }

  return byName;
}

import type { LintableNode, NodeSize, NodeSizeMap } from './types';

export const DEFAULT_NODE_SIZE: NodeSize = { width: 100, height: 80 };

export function getNodeSize(name: string, sizes: NodeSizeMap): NodeSize {
  return sizes.get(name) ?? DEFAULT_NODE_SIZE;
}

export function buildNodeSizesByName(
  nodes: LintableNode[],
  sizesById: Map<string, NodeSize>,
): NodeSizeMap {
  const byName: NodeSizeMap = new Map();
  for (const node of nodes) {
    const size = sizesById.get(node.id);
    if (size) byName.set(node.name, size);
  }
  return byName;
}

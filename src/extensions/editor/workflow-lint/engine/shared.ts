import { STICKY_NOTE_TYPE } from './types';
import type { ConnectionMap, ConnectionTarget, LintableNode } from './types';

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function renameConnections(
  connections: ConnectionMap,
  renameMap: Map<string, string>,
): ConnectionMap {
  const result: ConnectionMap = {};

  for (const [sourceName, outputs] of Object.entries(connections)) {
    const newSourceName = renameMap.get(sourceName) ?? sourceName;
    const newOutputs: typeof outputs = {};

    for (const [connType, slots] of Object.entries(outputs)) {
      newOutputs[connType] = slots.map((targets: ConnectionTarget[] | null) => {
        if (!targets) return null;
        return targets.map((target) => ({
          ...target,
          node: renameMap.get(target.node) ?? target.node,
        }));
      });
    }

    result[newSourceName] = newOutputs;
  }

  return result;
}

export function buildPositionMap(nodes: LintableNode[]): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  for (const node of nodes) {
    if (node.type !== STICKY_NOTE_TYPE) {
      map.set(node.name, [...node.position]);
    }
  }
  return map;
}

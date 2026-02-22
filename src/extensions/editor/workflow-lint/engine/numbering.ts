import type { ConnectionMap, LintableNode, NumberingConfig, TopologyResult } from './types';

function formatNumber(n: number, format: NumberingConfig['format']): string {
  if (format === 'roman') return toRoman(n);
  if (format === 'alpha') return String.fromCharCode(64 + n);
  return String(n);
}

function toRoman(num: number): string {
  const romanNumerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let remaining = num;
  for (const [value, symbol] of romanNumerals) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

function interpolatePattern(pattern: string, vars: Record<string, string>): string {
  let result = pattern;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function processSection(
  section: { id: number; nodeNames: string[] },
  index: number,
  config: NumberingConfig,
  sectionLabels: Map<number, string>,
  renameMap: Map<string, string>,
  usedNames: Set<string>,
): void {
  const sectionNumber = formatNumber(config.startFrom + index, config.format);
  const firstNodeName = section.nodeNames[0] ?? 'Section';
  const label = interpolatePattern(config.sectionPattern, {
    number: sectionNumber,
    label: firstNodeName,
    name: firstNodeName,
  });
  sectionLabels.set(section.id, label);

  if (!config.nodePattern.includes('{number}')) return;

  for (const nodeName of section.nodeNames) {
    let newName = interpolatePattern(config.nodePattern, {
      number: sectionNumber,
      name: nodeName,
      label: nodeName,
    });
    if (newName === nodeName) continue;

    if (usedNames.has(newName)) {
      let suffix = 2;
      while (usedNames.has(`${newName} ${suffix}`)) {
        suffix++;
      }
      newName = `${newName} ${suffix}`;
    }

    usedNames.add(newName);
    renameMap.set(nodeName, newName);
  }
}

function renameConnections(
  connections: ConnectionMap,
  renameMap: Map<string, string>,
): ConnectionMap {
  const result: ConnectionMap = {};

  for (const [sourceName, outputs] of Object.entries(connections)) {
    const newSourceName = renameMap.get(sourceName) ?? sourceName;
    const newOutputs: typeof outputs = {};

    for (const [connType, slots] of Object.entries(outputs)) {
      newOutputs[connType] = slots.map((targets) => {
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

export function applyNumbering(
  nodes: LintableNode[],
  connections: ConnectionMap,
  topology: TopologyResult,
  config: NumberingConfig,
): {
  nodes: LintableNode[];
  connections: ConnectionMap;
  sectionLabels: Map<number, string>;
} {
  const sectionLabels = new Map<number, string>();

  if (!config.enabled) {
    for (const section of topology.sections) {
      sectionLabels.set(section.id, section.name);
    }
    return { nodes, connections, sectionLabels };
  }

  const renameMap = new Map<string, string>();
  const usedNames = new Set(nodes.map((n) => n.name));

  for (let i = 0; i < topology.sections.length; i++) {
    const section = topology.sections[i];
    if (!section) continue;
    processSection(section, i, config, sectionLabels, renameMap, usedNames);
  }

  if (renameMap.size === 0) {
    return { nodes, connections, sectionLabels };
  }

  const renamedNodes = nodes.map((node) => {
    const newName = renameMap.get(node.name);
    if (!newName) return node;
    return { ...node, name: newName };
  });

  const renamedConnections = renameConnections(connections, renameMap);

  return { nodes: renamedNodes, connections: renamedConnections, sectionLabels };
}

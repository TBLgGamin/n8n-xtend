import { formatCollisionSuffix } from './naming';
import { renameConnections } from './shared';
import type { ConnectionMap, LintableNode, NumberingConfig, TopologyResult } from './types';

function convertToAlpha(n: number): string {
  let result = '';
  let remaining = n;
  while (remaining > 0) {
    remaining--;
    result = String.fromCharCode(65 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function formatNumber(n: number, format: NumberingConfig['format']): string {
  if (format === 'roman') return convertToRoman(n);
  if (format === 'alpha') return convertToAlpha(n);
  return String(n);
}

const ROMAN_NUMERAL_TABLE: ReadonlyArray<readonly [number, string]> = [
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
] as const;

function convertToRoman(num: number): string {
  let result = '';
  let remaining = num;
  for (const [value, symbol] of ROMAN_NUMERAL_TABLE) {
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

function buildTemplateVars(
  sectionNumber: string,
  name: string,
  index: number,
  totalSections: number,
  topology: TopologyResult,
): Record<string, string> {
  const graphNode = topology.nodes.get(name);
  return {
    number: sectionNumber,
    label: name,
    name,
    index: String(index),
    total: String(totalSections),
    depth: String(graphNode?.depth ?? 0),
    type: graphNode?.type ?? '',
    role: graphNode?.role ?? 'regular',
  };
}

function renameNodes(
  section: { nodeNames: string[] },
  sectionNumber: string,
  index: number,
  totalSections: number,
  topology: TopologyResult,
  config: NumberingConfig,
  collisionFormat: string,
  renameMap: Map<string, string>,
  usedNames: Set<string>,
): void {
  if (!config.nodePattern.includes('{number}')) return;

  for (const nodeName of section.nodeNames) {
    const vars = buildTemplateVars(sectionNumber, nodeName, index, totalSections, topology);
    let newName = interpolatePattern(config.nodePattern, vars);
    if (newName === nodeName) continue;

    if (usedNames.has(newName)) {
      let suffix = 2;
      while (usedNames.has(formatCollisionSuffix(newName, suffix, collisionFormat))) {
        suffix++;
      }
      newName = formatCollisionSuffix(newName, suffix, collisionFormat);
    }

    usedNames.add(newName);
    renameMap.set(nodeName, newName);
  }
}

function processSection(
  section: { id: number; nodeNames: string[] },
  index: number,
  totalSections: number,
  topology: TopologyResult,
  config: NumberingConfig,
  collisionFormat: string,
  sectionLabels: Map<number, string>,
  renameMap: Map<string, string>,
  usedNames: Set<string>,
): void {
  const sectionNumber = formatNumber(config.startFrom + index, config.format);
  const firstNodeName = section.nodeNames[0] ?? 'Section';

  if (config.numberSections) {
    const vars = buildTemplateVars(sectionNumber, firstNodeName, index, totalSections, topology);
    sectionLabels.set(section.id, interpolatePattern(config.sectionPattern, vars));
  } else {
    sectionLabels.set(section.id, firstNodeName);
  }

  if (!config.numberNodes) return;
  renameNodes(
    section,
    sectionNumber,
    index,
    totalSections,
    topology,
    config,
    collisionFormat,
    renameMap,
    usedNames,
  );
}

export function applyNumbering(
  nodes: LintableNode[],
  connections: ConnectionMap,
  topology: TopologyResult,
  config: NumberingConfig,
  collisionFormat = ' {n}',
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
  const totalSections = topology.sections.length;

  for (let i = 0; i < topology.sections.length; i++) {
    const section = topology.sections[i];
    if (!section) continue;
    processSection(
      section,
      i,
      totalSections,
      topology,
      config,
      collisionFormat,
      sectionLabels,
      renameMap,
      usedNames,
    );
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

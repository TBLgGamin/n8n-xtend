import { logger } from '@/shared/utils';
import { generatedNodeNames } from './generated-node-names';
import { renameConnections } from './shared';
import { STICKY_NOTE_TYPE } from './types';
import type { ConnectionMap, LintableNode, NamingConfig } from './types';

const log = logger.child('lint:naming');

export const NUMBER_SUFFIX_PATTERN = /\s+\d+$/;

function getDefaultName(nodeType: string, nodeTypeNames: Map<string, string>): string {
  const runtime = nodeTypeNames.get(nodeType);
  if (runtime) return runtime;

  const generated = generatedNodeNames[nodeType];
  if (generated) return generated;

  const parts = nodeType.split('.');
  const lastPart = parts[parts.length - 1] ?? nodeType;
  return lastPart.replace(/([A-Z])/g, ' $1').trim();
}

function isDefaultName(
  name: string,
  nodeType: string,
  nodeTypeNames: Map<string, string>,
): boolean {
  const baseName = name.replace(NUMBER_SUFFIX_PATTERN, '').trim();
  const defaultName = getDefaultName(nodeType, nodeTypeNames);
  return baseName.toLowerCase() === defaultName.toLowerCase();
}

const TITLE_CASE_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'nor',
  'of',
  'on',
  'or',
  'so',
  'the',
  'to',
  'via',
  'with',
  'yet',
]);

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map((word, index) => {
      if (word.length === 0) return word;
      if (index > 0 && TITLE_CASE_STOPWORDS.has(word.toLowerCase())) return word.toLowerCase();
      return (word[0] ?? '').toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function computeDesiredName(
  node: LintableNode,
  config: NamingConfig,
  nodeTypeNames: Map<string, string>,
): string | null {
  if (node.type === STICKY_NOTE_TYPE) return null;
  if (config.excludeTypes.includes(node.type)) return null;

  if (config.preserveCustom && !isDefaultName(node.name, node.type, nodeTypeNames)) {
    return null;
  }

  let name = node.name;

  if (config.removeNumberSuffix) {
    name = name.replace(NUMBER_SUFFIX_PATTERN, '').trim();
  }

  if (config.titleCase) {
    name = toTitleCase(name);
  }

  if (name === node.name) return null;

  return name;
}

export function formatCollisionSuffix(name: string, n: number, format: string): string {
  return `${name}${format.replace('{n}', String(n))}`;
}

function resolveCollisions(
  desiredNames: Map<string, string>,
  allNodeNames: Set<string>,
  collisionFormat: string,
): Map<string, string> {
  const usedNames = new Set(allNodeNames);
  const finalNames = new Map<string, string>();

  for (const [oldName, newName] of desiredNames) {
    if (!usedNames.has(newName)) {
      finalNames.set(oldName, newName);
      usedNames.add(newName);
    } else {
      let suffix = 2;
      while (usedNames.has(formatCollisionSuffix(newName, suffix, collisionFormat))) {
        suffix++;
      }
      const resolved = formatCollisionSuffix(newName, suffix, collisionFormat);
      finalNames.set(oldName, resolved);
      usedNames.add(resolved);
    }
  }

  return finalNames;
}

export function applyNaming(
  nodes: LintableNode[],
  connections: ConnectionMap,
  config: NamingConfig,
  nodeTypeNames: Map<string, string> = new Map(),
): { nodes: LintableNode[]; connections: ConnectionMap; renames: Map<string, string> } {
  if (!config.enabled) {
    return { nodes, connections, renames: new Map() };
  }

  const desiredNames = new Map<string, string>();
  for (const node of nodes) {
    const desired = computeDesiredName(node, config, nodeTypeNames);
    if (desired) {
      desiredNames.set(node.name, desired);
    }
  }

  if (desiredNames.size === 0) {
    return { nodes, connections, renames: new Map() };
  }

  const allNodeNames = new Set(nodes.map((n) => n.name));
  const renameMap = resolveCollisions(desiredNames, allNodeNames, config.collisionFormat);

  const renamedNodes = nodes.map((node) => {
    const newName = renameMap.get(node.name);
    if (!newName) return node;
    return { ...node, name: newName };
  });

  const renamedConnections = renameConnections(connections, renameMap);

  log.debug('Naming applied', { renamed: renameMap.size });

  return { nodes: renamedNodes, connections: renamedConnections, renames: renameMap };
}

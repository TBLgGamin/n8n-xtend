import type { ConnectionMap, LintableNode, NamingConfig } from './types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const NUMBER_SUFFIX_PATTERN = /\s+\d+$/;

const defaultNodeNames: Record<string, string> = {
  'n8n-nodes-base.httpRequest': 'HTTP Request',
  'n8n-nodes-base.set': 'Edit Fields',
  'n8n-nodes-base.if': 'If',
  'n8n-nodes-base.switch': 'Switch',
  'n8n-nodes-base.code': 'Code',
  'n8n-nodes-base.merge': 'Merge',
  'n8n-nodes-base.noOp': 'No Operation',
  'n8n-nodes-base.splitInBatches': 'Split In Batches',
  'n8n-nodes-base.wait': 'Wait',
  'n8n-nodes-base.function': 'Function',
  'n8n-nodes-base.functionItem': 'Function Item',
  'n8n-nodes-base.executeWorkflow': 'Execute Workflow',
  'n8n-nodes-base.respondToWebhook': 'Respond to Webhook',
};

function getDefaultName(nodeType: string): string {
  const known = defaultNodeNames[nodeType];
  if (known) return known;

  const parts = nodeType.split('.');
  const lastPart = parts[parts.length - 1] ?? nodeType;
  return lastPart.replace(/([A-Z])/g, ' $1').trim();
}

function isDefaultName(name: string, nodeType: string): boolean {
  const baseName = name.replace(NUMBER_SUFFIX_PATTERN, '').trim();
  const defaultName = getDefaultName(nodeType);
  return baseName.toLowerCase() === defaultName.toLowerCase();
}

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map((word) => {
      if (word.length === 0) return word;
      return (word[0] ?? '').toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function computeDesiredName(node: LintableNode, config: NamingConfig): string | null {
  if (node.type === STICKY_NOTE_TYPE) return null;
  if (config.excludeTypes.includes(node.type)) return null;

  const customName = config.customNames[node.type];
  if (customName) return customName;

  if (config.preserveCustom && !isDefaultName(node.name, node.type)) {
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

function resolveCollisions(
  desiredNames: Map<string, string>,
  allNodeNames: Set<string>,
): Map<string, string> {
  const usedNames = new Set(allNodeNames);
  const finalNames = new Map<string, string>();

  for (const [oldName, newName] of desiredNames) {
    if (!usedNames.has(newName)) {
      finalNames.set(oldName, newName);
      usedNames.add(newName);
    } else {
      let suffix = 2;
      while (usedNames.has(`${newName} ${suffix}`)) {
        suffix++;
      }
      const resolved = `${newName} ${suffix}`;
      finalNames.set(oldName, resolved);
      usedNames.add(resolved);
    }
  }

  return finalNames;
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

export function applyNaming(
  nodes: LintableNode[],
  connections: ConnectionMap,
  config: NamingConfig,
): { nodes: LintableNode[]; connections: ConnectionMap; renames: Map<string, string> } {
  if (!config.enabled) {
    return { nodes, connections, renames: new Map() };
  }

  const desiredNames = new Map<string, string>();
  for (const node of nodes) {
    const desired = computeDesiredName(node, config);
    if (desired) {
      desiredNames.set(node.name, desired);
    }
  }

  if (desiredNames.size === 0) {
    return { nodes, connections, renames: new Map() };
  }

  const allNodeNames = new Set(nodes.map((n) => n.name));
  const renameMap = resolveCollisions(desiredNames, allNodeNames);

  const renamedNodes = nodes.map((node) => {
    const newName = renameMap.get(node.name);
    if (!newName) return node;
    return { ...node, name: newName };
  });

  const renamedConnections = renameConnections(connections, renameMap);

  return { nodes: renamedNodes, connections: renamedConnections, renames: renameMap };
}

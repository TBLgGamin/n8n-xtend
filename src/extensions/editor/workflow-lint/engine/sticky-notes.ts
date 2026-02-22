import { getNodeSize } from './node-sizes';
import type {
  LintableNode,
  NodeRole,
  NodeSizeMap,
  StickyColor,
  StickyNoteConfig,
  StickyNoteRule,
  TopologyResult,
} from './types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const STICKY_LINT_PREFIX = 'sticky-lint-';

function interpolateTitle(pattern: string, number: number, label: string): string {
  return pattern
    .replaceAll('{number}', String(number))
    .replaceAll('{label}', label)
    .replaceAll('{name}', label);
}

function collectPositionsWithNames(
  names: string[],
  nodes: LintableNode[],
): { positions: [number, number][]; resolvedNames: string[] } {
  const positions: [number, number][] = [];
  const resolvedNames: string[] = [];
  for (const name of names) {
    const node = nodes.find((n) => n.name === name);
    if (node) {
      positions.push(node.position);
      resolvedNames.push(name);
    }
  }
  return { positions, resolvedNames };
}

function computeSizedBounds(
  positions: [number, number][],
  names: string[],
  nodeSizes: NodeSizeMap,
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const result = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const name = names[i];
    if (!pos || !name) continue;
    const size = getNodeSize(name, nodeSizes);
    result.minX = Math.min(result.minX, pos[0]);
    result.minY = Math.min(result.minY, pos[1]);
    result.maxX = Math.max(result.maxX, pos[0] + size.width);
    result.maxY = Math.max(result.maxY, pos[1] + size.height);
  }

  return result;
}

function matchesRule(rule: StickyNoteRule, role: NodeRole, nodeType: string): boolean {
  if (rule.roles && !rule.roles.includes(role)) return false;
  if (rule.types && !rule.types.includes(nodeType)) return false;
  if (rule.notRoles?.includes(role)) return false;
  if (rule.notTypes?.includes(nodeType)) return false;
  return true;
}

function resolveColor(
  index: number,
  label: string,
  role: NodeRole,
  nodeType: string,
  config: StickyNoteConfig,
): StickyColor {
  for (const rule of config.colorRules) {
    if (matchesRule(rule, role, nodeType)) return rule.color;
  }
  return config.colors[label] ?? config.colors[String(index)] ?? config.color;
}

function createStickyNode(
  id: string,
  index: number,
  label: string,
  title: string,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  role: NodeRole,
  nodeType: string,
  config: StickyNoteConfig,
): LintableNode {
  const calcWidth = bounds.maxX - bounds.minX + config.padding.left + config.padding.right;
  const calcHeight = bounds.maxY - bounds.minY + config.padding.top + config.padding.bottom;

  return {
    id,
    name: `Sticky Note - ${label}`,
    type: STICKY_NOTE_TYPE,
    position: [bounds.minX - config.padding.left, bounds.minY - config.padding.top],
    parameters: {
      content: title,
      width: Math.max(calcWidth, config.minWidth),
      height: Math.max(calcHeight, config.minHeight),
      color: resolveColor(index, label, role, nodeType, config),
    },
  };
}

function getSectionLabel(
  section: { nodeNames: string[]; triggerName: string | null },
  sectionLabels: Map<number, string>,
  sectionId: number,
  config: StickyNoteConfig,
): string {
  const existing = sectionLabels.get(sectionId);
  if (existing) return existing;

  if (config.labelSource === 'custom') {
    const sectionName = section.nodeNames[0] ?? 'Section';
    return (
      config.customLabels[sectionName] ?? config.customLabels[String(sectionId)] ?? sectionName
    );
  }

  if (config.labelSource === 'triggerType') {
    return section.triggerName ?? section.nodeNames[0] ?? 'Section';
  }

  return section.nodeNames[0] ?? 'Section';
}

function getNodeLabel(nodeName: string, nodeIndex: number, config: StickyNoteConfig): string {
  if (config.labelSource === 'custom') {
    return config.customLabels[nodeName] ?? config.customLabels[String(nodeIndex)] ?? nodeName;
  }
  return nodeName;
}

const ROLE_PRIORITY: Record<NodeRole, number> = {
  trigger: 5,
  'branch-point': 4,
  'merge-point': 3,
  terminal: 2,
  regular: 1,
};

function findRepresentativeNode(
  section: { nodeNames: string[] },
  topology: TopologyResult,
  config: StickyNoteConfig,
): { role: NodeRole; type: string } {
  const fallback = () => {
    const firstName = section.nodeNames[0];
    const firstNode = firstName ? topology.nodes.get(firstName) : undefined;
    return { role: (firstNode?.role ?? 'regular') as NodeRole, type: firstNode?.type ?? '' };
  };

  if (config.colorRules.length === 0) return fallback();

  let bestRole: NodeRole = 'regular';
  let bestType = '';
  let bestPriority = -1;

  for (const nodeName of section.nodeNames) {
    const graphNode = topology.nodes.get(nodeName);
    if (!graphNode) continue;

    for (const rule of config.colorRules) {
      if (matchesRule(rule, graphNode.role, graphNode.type)) {
        const priority = ROLE_PRIORITY[graphNode.role];
        if (priority > bestPriority) {
          bestPriority = priority;
          bestRole = graphNode.role;
          bestType = graphNode.type;
        }
      }
    }
  }

  if (bestPriority === -1) return fallback();
  return { role: bestRole, type: bestType };
}

function applySectionGrouping(
  result: LintableNode[],
  topology: TopologyResult,
  sectionLabels: Map<number, string>,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
): LintableNode[] {
  let nodes = [...result];

  for (let i = 0; i < topology.sections.length; i++) {
    const section = topology.sections[i];
    if (!section) continue;
    const allNames = [...section.nodeNames, ...section.subNodeNames];

    if (allNames.length === 0) continue;

    const { positions, resolvedNames } = collectPositionsWithNames(allNames, nodes);
    if (positions.length === 0) continue;

    const bounds = computeSizedBounds(positions, resolvedNames, nodeSizes);
    const label = getSectionLabel(section, sectionLabels, section.id, config);
    const stickyTitle = interpolateTitle(config.titlePattern, i + 1, label);

    const { role, type: nodeType } = findRepresentativeNode(section, topology, config);

    nodes = [
      ...nodes,
      createStickyNode(
        `sticky-lint-${section.id}`,
        i,
        label,
        stickyTitle,
        bounds,
        role,
        nodeType,
        config,
      ),
    ];
  }

  return nodes;
}

function computeParentAnchoredBounds(
  parentPos: [number, number],
  positions: [number, number][],
  names: string[],
  nodeSizes: NodeSizeMap,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const rawBounds = computeSizedBounds(positions, names, nodeSizes);

  const parentSize = getNodeSize(names[0] ?? '', nodeSizes);
  const parentCenterX = parentPos[0] + parentSize.width / 2;

  const leftExtent = parentCenterX - rawBounds.minX;
  const rightExtent = rawBounds.maxX - parentCenterX;
  const symmetricExtent = Math.max(leftExtent, rightExtent);

  return {
    minX: parentCenterX - symmetricExtent,
    maxX: parentCenterX + symmetricExtent,
    minY: rawBounds.minY,
    maxY: rawBounds.maxY,
  };
}

function collectNodeStickyEntries(
  nodes: LintableNode[],
  topology: TopologyResult,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
): Array<{ mainNodeName: string; subNodeNames: string[]; sticky: LintableNode }> {
  const entries: Array<{ mainNodeName: string; subNodeNames: string[]; sticky: LintableNode }> = [];
  let nodeIndex = 0;

  for (const section of topology.sections) {
    for (const nodeName of section.nodeNames) {
      const graphNode = topology.nodes.get(nodeName);
      if (!graphNode) continue;

      const relatedNames = [nodeName, ...graphNode.subNodes];
      const { positions, resolvedNames } = collectPositionsWithNames(relatedNames, nodes);
      if (positions.length === 0) continue;

      const parentPos = positions[0];
      const hasSubNodes = graphNode.subNodes.length > 0 && parentPos;
      const bounds = hasSubNodes
        ? computeParentAnchoredBounds(parentPos, positions, resolvedNames, nodeSizes)
        : computeSizedBounds(positions, resolvedNames, nodeSizes);
      const label = getNodeLabel(nodeName, nodeIndex, config);
      const stickyTitle = interpolateTitle(config.titlePattern, nodeIndex + 1, label);

      entries.push({
        mainNodeName: nodeName,
        subNodeNames: [...graphNode.subNodes],
        sticky: createStickyNode(
          `sticky-lint-node-${nodeIndex}`,
          nodeIndex,
          label,
          stickyTitle,
          bounds,
          graphNode.role,
          graphNode.type,
          config,
        ),
      });
      nodeIndex++;
    }
  }

  return entries;
}

function resolveNodeStickyOverlaps(
  entries: Array<{ mainNodeName: string; subNodeNames: string[]; sticky: LintableNode }>,
): Map<string, number> {
  if (entries.length <= 1) return new Map();

  const sorted = [...entries].sort((a, b) => a.sticky.position[0] - b.sticky.position[0]);
  const shifts = new Map<string, number>();
  let cumulativeShift = 0;
  const first = sorted[0];
  if (!first) return shifts;
  let prevRight = first.sticky.position[0] + ((first.sticky.parameters.width as number) ?? 0);

  for (let i = 1; i < sorted.length; i++) {
    const entry = sorted[i];
    if (!entry) continue;
    const stickyWidth = (entry.sticky.parameters.width as number) ?? 0;
    const currLeft = entry.sticky.position[0] + cumulativeShift;

    if (currLeft < prevRight) {
      cumulativeShift += prevRight - currLeft;
    }

    if (cumulativeShift > 0) {
      shifts.set(entry.mainNodeName, cumulativeShift);
      for (const subName of entry.subNodeNames) {
        shifts.set(subName, cumulativeShift);
      }
    }

    prevRight = entry.sticky.position[0] + cumulativeShift + stickyWidth;
  }

  return shifts;
}

function applyNodeGrouping(
  result: LintableNode[],
  topology: TopologyResult,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
): LintableNode[] {
  const entries = collectNodeStickyEntries(result, topology, config, nodeSizes);
  const shifts = resolveNodeStickyOverlaps(entries);

  if (shifts.size === 0) {
    return [...result, ...entries.map((e) => e.sticky)];
  }

  const shiftedNodes = result.map((node) => {
    const shift = shifts.get(node.name);
    if (!shift) return node;
    return { ...node, position: [node.position[0] + shift, node.position[1]] as [number, number] };
  });

  const shiftedStickies = entries.map((entry) => {
    const shift = shifts.get(entry.mainNodeName) ?? 0;
    if (shift === 0) return entry.sticky;
    return {
      ...entry.sticky,
      position: [entry.sticky.position[0] + shift, entry.sticky.position[1]] as [number, number],
    };
  });

  return [...shiftedNodes, ...shiftedStickies];
}

export function applyStickyNotes(
  nodes: LintableNode[],
  topology: TopologyResult,
  sectionLabels: Map<number, string>,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
): LintableNode[] {
  if (!config.enabled) return nodes;

  const result = config.removeExisting
    ? nodes.filter((n) => n.type !== STICKY_NOTE_TYPE || !n.id.startsWith(STICKY_LINT_PREFIX))
    : [...nodes];

  if (config.grouping === 'node') {
    return applyNodeGrouping(result, topology, config, nodeSizes);
  }

  return applySectionGrouping(result, topology, sectionLabels, config, nodeSizes);
}

import { getNodeSize } from './node-sizes';
import { snapToGrid } from './shared';
import { STICKY_NOTE_TYPE } from './types';
import type {
  LayoutConfig,
  LintableNode,
  NodeRole,
  NodeSizeMap,
  StickyColor,
  StickyNoteConfig,
  StickyNoteRule,
  TopologyResult,
} from './types';

const STICKY_LINT_PREFIX = 'sticky-lint-';

interface TitleVars {
  number: number;
  label: string;
  index: number;
  total: number;
  depth: number;
  type: string;
  role: string;
}

function interpolateTitle(pattern: string, vars: TitleVars): string {
  return pattern
    .replaceAll('{number}', String(vars.number))
    .replaceAll('{label}', vars.label)
    .replaceAll('{name}', vars.label)
    .replaceAll('{index}', String(vars.index))
    .replaceAll('{total}', String(vars.total))
    .replaceAll('{depth}', String(vars.depth))
    .replaceAll('{type}', vars.type)
    .replaceAll('{role}', vars.role);
}

function collectPositionsWithNames(
  names: string[],
  nodesByName: Map<string, LintableNode>,
): { positions: [number, number][]; resolvedNames: string[] } {
  const positions: [number, number][] = [];
  const resolvedNames: string[] = [];
  for (const name of names) {
    const node = nodesByName.get(name);
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
): { minX: number; minY: number; maxX: number; maxY: number } {
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

function matchesRule(
  rule: StickyNoteRule,
  role: NodeRole,
  nodeType: string,
  nodeName?: string,
  depth?: number,
  sectionIndex?: number,
): boolean {
  if (rule.roles && !rule.roles.includes(role)) return false;
  if (rule.types && !rule.types.includes(nodeType)) return false;
  if (rule.notRoles?.includes(role)) return false;
  if (rule.notTypes?.includes(nodeType)) return false;
  if (rule.namePatterns && nodeName !== undefined) {
    const matches = rule.namePatterns.some((p) => new RegExp(p).test(nodeName));
    if (!matches) return false;
  }
  if (rule.depths && depth !== undefined && !rule.depths.includes(depth)) return false;
  if (
    rule.sectionIndexes &&
    sectionIndex !== undefined &&
    !rule.sectionIndexes.includes(sectionIndex)
  )
    return false;
  return true;
}

function resolveColor(
  index: number,
  label: string,
  role: NodeRole,
  nodeType: string,
  config: StickyNoteConfig,
  nodeName?: string,
  depth?: number,
  sectionIndex?: number,
): StickyColor {
  for (const rule of config.colorRules) {
    if (matchesRule(rule, role, nodeType, nodeName, depth, sectionIndex)) return rule.color;
  }
  return config.colors[label] ?? config.colors[String(index)] ?? config.color;
}

function interpolateName(pattern: string, label: string): string {
  return pattern.replaceAll('{label}', label);
}

function clampDimension(value: number, min: number, max: number): number {
  const clamped = Math.max(value, min);
  return max > 0 ? Math.min(clamped, max) : clamped;
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
  nodeName?: string,
  depth?: number,
  sectionIndex?: number,
): LintableNode {
  const calcWidth = bounds.maxX - bounds.minX + config.padding.left + config.padding.right;
  const calcHeight = bounds.maxY - bounds.minY + config.padding.top + config.padding.bottom;

  return {
    id,
    name: interpolateName(config.namePattern, label),
    type: STICKY_NOTE_TYPE,
    position: [bounds.minX - config.padding.left, bounds.minY - config.padding.top],
    parameters: {
      content: title,
      width: clampDimension(calcWidth, config.minWidth, config.maxWidth),
      height: clampDimension(calcHeight, config.minHeight, config.maxHeight),
      color: resolveColor(index, label, role, nodeType, config, nodeName, depth, sectionIndex),
    },
  };
}

const NUMBER_PREFIX_PATTERN = /^(##\s*)\d+\.\s*/;

function updateStickyNumbering(existingContent: string, generatedContent: string): string {
  const genMatch = (generatedContent as string).match(NUMBER_PREFIX_PATTERN);
  if (!genMatch) return existingContent;
  const newPrefix = genMatch[0];

  const existMatch = (existingContent as string).match(NUMBER_PREFIX_PATTERN);
  if (existMatch) {
    return (existingContent as string).replace(NUMBER_PREFIX_PATTERN, newPrefix);
  }

  const headingMatch = (existingContent as string).match(/^##\s*/);
  if (headingMatch) {
    return (existingContent as string).replace(/^##\s*/, newPrefix);
  }

  return existingContent;
}

function updateExistingSticky(existing: LintableNode, generated: LintableNode): LintableNode {
  return {
    ...existing,
    parameters: {
      ...existing.parameters,
      content: updateStickyNumbering(
        existing.parameters.content as string,
        generated.parameters.content as string,
      ),
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

function findRepresentativeNode(
  section: { nodeNames: string[] },
  topology: TopologyResult,
  config: StickyNoteConfig,
): { role: NodeRole; type: string; name: string; depth: number } {
  const fallback = () => {
    const firstName = section.nodeNames[0];
    const firstNode = firstName ? topology.nodes.get(firstName) : undefined;
    return {
      role: (firstNode?.role ?? 'regular') as NodeRole,
      type: firstNode?.type ?? '',
      name: firstName ?? '',
      depth: firstNode?.depth ?? 0,
    };
  };

  if (config.colorRules.length === 0) return fallback();

  let bestRole: NodeRole = 'regular';
  let bestType = '';
  let bestName = '';
  let bestDepth = 0;
  let bestPriority = -1;

  for (const nodeName of section.nodeNames) {
    const graphNode = topology.nodes.get(nodeName);
    if (!graphNode) continue;

    for (const rule of config.colorRules) {
      if (matchesRule(rule, graphNode.role, graphNode.type, graphNode.name, graphNode.depth)) {
        const priority = config.rolePriority[graphNode.role];
        if (priority > bestPriority) {
          bestPriority = priority;
          bestRole = graphNode.role;
          bestType = graphNode.type;
          bestName = graphNode.name;
          bestDepth = graphNode.depth;
        }
      }
    }
  }

  if (bestPriority === -1) return fallback();
  return { role: bestRole, type: bestType, name: bestName, depth: bestDepth };
}

function applySectionGrouping(
  nonStickyNodes: LintableNode[],
  existingLintStickies: Map<string, LintableNode>,
  topology: TopologyResult,
  sectionLabels: Map<number, string>,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
): LintableNode[] {
  const newStickies: LintableNode[] = [];
  const nodesByName = new Map(nonStickyNodes.map((n) => [n.name, n]));
  const usedIds = new Set<string>();

  for (let i = 0; i < topology.sections.length; i++) {
    const section = topology.sections[i];
    if (!section) continue;
    const allNames = [...section.nodeNames, ...section.subNodeNames];
    if (allNames.length === 0) continue;

    const { positions, resolvedNames } = collectPositionsWithNames(allNames, nodesByName);
    if (positions.length === 0) continue;

    const bounds = computeSizedBounds(positions, resolvedNames, nodeSizes);
    const label = getSectionLabel(section, sectionLabels, section.id, config);
    const rep = findRepresentativeNode(section, topology, config);
    const triggerNode = section.triggerName
      ? topology.nodes.get(section.triggerName)
      : topology.nodes.get(section.nodeNames[0] ?? '');
    const stickyId = `sticky-lint-sec-${triggerNode?.id ?? section.id}`;
    usedIds.add(stickyId);

    const generated = createStickyNode(
      stickyId,
      i,
      label,
      interpolateTitle(config.titlePattern, {
        number: i + 1,
        label,
        index: i,
        total: topology.sections.length,
        depth: rep.depth,
        type: rep.type,
        role: rep.role,
      }),
      bounds,
      rep.role,
      rep.type,
      config,
      rep.name,
      rep.depth,
      i,
    );

    const existing = existingLintStickies.get(stickyId);
    newStickies.push(existing ? updateExistingSticky(existing, generated) : generated);
  }

  return newStickies;
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

function computeNodeBounds(
  graphNode: { subNodes: string[] },
  nodeName: string,
  nodesByName: Map<string, LintableNode>,
  nodeSizes: NodeSizeMap,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const relatedNames = [nodeName, ...graphNode.subNodes];
  const { positions, resolvedNames } = collectPositionsWithNames(relatedNames, nodesByName);
  if (positions.length === 0) return null;

  const parentPos = positions[0];
  const hasSubNodes = graphNode.subNodes.length > 0 && parentPos;
  return hasSubNodes
    ? computeParentAnchoredBounds(parentPos, positions, resolvedNames, nodeSizes)
    : computeSizedBounds(positions, resolvedNames, nodeSizes);
}

function buildNodeLintSticky(
  nodeId: string,
  nodeName: string,
  graphNode: { role: NodeRole; type: string; name: string; depth: number },
  nodeIndex: number,
  sectionIndex: number,
  totalSections: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  config: StickyNoteConfig,
): LintableNode {
  const label = getNodeLabel(nodeName, nodeIndex, config);
  return createStickyNode(
    `sticky-lint-${nodeId}`,
    nodeIndex,
    label,
    interpolateTitle(config.titlePattern, {
      number: nodeIndex + 1,
      label,
      index: sectionIndex,
      total: totalSections,
      depth: graphNode.depth,
      type: graphNode.type,
      role: graphNode.role,
    }),
    bounds,
    graphNode.role,
    graphNode.type,
    config,
    graphNode.name,
    graphNode.depth,
    sectionIndex,
  );
}

function applyNodeGrouping(
  nonStickyNodes: LintableNode[],
  existingLintStickies: Map<string, LintableNode>,
  topology: TopologyResult,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
): LintableNode[] {
  const newStickies: LintableNode[] = [];
  const nodesByName = new Map(nonStickyNodes.map((n) => [n.name, n]));
  let nodeIndex = 0;

  let sectionIndex = 0;
  for (const section of topology.sections) {
    for (const nodeName of section.nodeNames) {
      const graphNode = topology.nodes.get(nodeName);
      if (!graphNode) continue;

      const bounds = computeNodeBounds(graphNode, nodeName, nodesByName, nodeSizes);
      if (!bounds) continue;

      const stickyId = `sticky-lint-${graphNode.id}`;
      const generated = buildNodeLintSticky(
        graphNode.id,
        nodeName,
        graphNode,
        nodeIndex,
        sectionIndex,
        topology.sections.length,
        bounds,
        config,
      );

      const existing = existingLintStickies.get(stickyId);
      newStickies.push(existing ? updateExistingSticky(existing, generated) : generated);
      nodeIndex++;
    }
    sectionIndex++;
  }

  return newStickies;
}

function snapStickyDimensions(nodes: LintableNode[], layoutConfig: LayoutConfig): LintableNode[] {
  if (!layoutConfig.snapToGrid) return nodes;
  return nodes.map((node) => {
    if (node.type !== STICKY_NOTE_TYPE) return node;
    const width = node.parameters.width as number | undefined;
    const height = node.parameters.height as number | undefined;
    if (width === undefined && height === undefined) return node;
    return {
      ...node,
      position: [
        snapToGrid(node.position[0], layoutConfig.gridSize),
        snapToGrid(node.position[1], layoutConfig.gridSize),
      ],
      parameters: {
        ...node.parameters,
        ...(width !== undefined && { width: snapToGrid(width, layoutConfig.gridSize) }),
        ...(height !== undefined && { height: snapToGrid(height, layoutConfig.gridSize) }),
      },
    };
  });
}

export function applyStickyNotes(
  nodes: LintableNode[],
  topology: TopologyResult,
  sectionLabels: Map<number, string>,
  config: StickyNoteConfig,
  nodeSizes: NodeSizeMap,
  layoutConfig: LayoutConfig,
): LintableNode[] {
  if (!config.enabled) return nodes;

  const userStickies = nodes.filter(
    (n) => n.type === STICKY_NOTE_TYPE && !n.id.startsWith(STICKY_LINT_PREFIX),
  );
  const existingLintStickies = new Map<string, LintableNode>();
  for (const node of nodes) {
    if (node.type === STICKY_NOTE_TYPE && node.id.startsWith(STICKY_LINT_PREFIX)) {
      existingLintStickies.set(node.id, node);
    }
  }
  const nonStickyNodes = nodes.filter((n) => n.type !== STICKY_NOTE_TYPE);

  const lintStickies =
    config.grouping === 'node'
      ? applyNodeGrouping(nonStickyNodes, existingLintStickies, topology, config, nodeSizes)
      : applySectionGrouping(
          nonStickyNodes,
          existingLintStickies,
          topology,
          sectionLabels,
          config,
          nodeSizes,
        );

  const result = [...nonStickyNodes, ...userStickies, ...lintStickies];
  return snapStickyDimensions(result, layoutConfig);
}

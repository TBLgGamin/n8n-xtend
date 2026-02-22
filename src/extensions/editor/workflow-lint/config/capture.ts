import { logger } from '@/shared/utils';
import {
  DEFAULT_LINT_CONFIG,
  N8N_DEFAULT_STICKY_HEX,
  normalizeStickyColor,
} from '../engine/defaults';
import { buildNodeSizesByName, getNodeSize } from '../engine/node-sizes';
import { analyzeTopology } from '../engine/topology';
import type {
  ConnectionMap,
  LintConfig,
  LintableNode,
  NodeSize,
  NodeSizeMap,
  StickyColor,
  StickyNoteRule,
  TopologyResult,
} from '../engine/types';

const log = logger.child('lint:capture');

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const ALIGNMENT_TOLERANCE = 5;
const ALIGNMENT_THRESHOLD = 0.7;
const MIN_GRID_SIZE = 10;

const knownDefaultNames: Record<string, string> = {
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

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  }
  return sorted[mid] ?? 0;
}

function gcd(x: number, y: number): number {
  let a = Math.abs(x);
  let b = Math.abs(y);
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function gcdOfArray(values: number[]): number {
  const nonZero = values.filter((v) => v !== 0).map((v) => Math.abs(v));
  if (nonZero.length === 0) return 0;
  let result = nonZero[0] ?? 0;
  for (let i = 1; i < nonZero.length; i++) {
    result = gcd(result, nonZero[i] ?? 0);
    if (result === 1) return 1;
  }
  return result;
}

function getDefaultName(nodeType: string): string {
  const known = knownDefaultNames[nodeType];
  if (known) return known;
  const parts = nodeType.split('.');
  const lastPart = parts[parts.length - 1] ?? nodeType;
  return lastPart.replace(/([A-Z])/g, ' $1').trim();
}

function isTitleCase(text: string): boolean {
  const words = text.split(' ').filter((w) => w.length > 0);
  if (words.length === 0) return false;
  return words.every((word) => {
    const first = word[0] ?? '';
    return first === first.toUpperCase();
  });
}

function stripNumberingPrefix(name: string): { stripped: string; format: string | null } {
  const romanMatch = name.match(/^([IVXLCDM]+)\.\s+(?:[IVXLCDM]+\.\s+)*(.+)$/);
  if (romanMatch?.[2]) {
    return { stripped: romanMatch[2], format: 'roman' };
  }

  const numericMatch = name.match(/^(\d+)\.\s+(?:\d+\.\s+)*(.+)$/);
  if (numericMatch?.[2]) {
    return { stripped: numericMatch[2], format: 'numeric' };
  }

  const alphaMatch = name.match(/^([A-Z])\.\s+(?:[A-Z]\.\s+)*(.+)$/);
  if (alphaMatch?.[2]) {
    return { stripped: alphaMatch[2], format: 'alpha' };
  }

  return { stripped: name, format: null };
}

function parseRoman(str: string): number {
  const romanValues: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const current = romanValues[str[i] ?? ''] ?? 0;
    const next = romanValues[str[i + 1] ?? ''] ?? 0;
    result += current < next ? -current : current;
  }
  return Math.max(1, result);
}

function countNumberingFormats(nodes: LintableNode[]): {
  romanCount: number;
  numericCount: number;
  alphaCount: number;
} {
  let romanCount = 0;
  let numericCount = 0;
  let alphaCount = 0;

  for (const node of nodes) {
    const { format } = stripNumberingPrefix(node.name);
    if (format === 'roman') romanCount++;
    else if (format === 'numeric') numericCount++;
    else if (format === 'alpha') alphaCount++;
  }

  return { romanCount, numericCount, alphaCount };
}

function detectStartFrom(triggerNames: string[], mainNodes: LintableNode[]): number {
  for (const triggerName of triggerNames) {
    const node = mainNodes.find((n) => n.name === triggerName);
    if (!node) continue;

    const numMatch = node.name.match(/^(\d+)\./);
    if (numMatch?.[1]) return Number.parseInt(numMatch[1], 10);

    const romMatch = node.name.match(/^([IVXLCDM]+)\./);
    if (romMatch?.[1]) return parseRoman(romMatch[1]);

    const alpMatch = node.name.match(/^([A-Z])\./);
    if (alpMatch?.[1]) return alpMatch[1].charCodeAt(0) - 64;
  }
  return 1;
}

function detectNodePattern(mainNodes: LintableNode[], format: string): string {
  const sampleNode = mainNodes.find((n) => stripNumberingPrefix(n.name).format === format);
  if (!sampleNode) return '{number}. {name}';

  const repeatedPrefix = sampleNode.name.match(/^(?:[^.]+\.\s+)+/);
  if (!repeatedPrefix) return '{number}. {name}';

  const prefixCount = (repeatedPrefix[0].match(/\./g) ?? []).length;
  return `${'{number}. '.repeat(prefixCount)}{name}`;
}

function detectNumbering(
  nodes: LintableNode[],
  topology: TopologyResult,
): {
  enabled: boolean;
  format: 'numeric' | 'roman' | 'alpha';
  startFrom: number;
  sectionPattern: string;
  nodePattern: string;
} {
  const mainNodes = nodes.filter(
    (n) => n.type !== STICKY_NOTE_TYPE && !topology.nodes.get(n.name)?.subNodeParent,
  );
  if (mainNodes.length === 0) return { ...DEFAULT_LINT_CONFIG.numbering };

  const { romanCount, numericCount, alphaCount } = countNumberingFormats(mainNodes);

  const maxCount = Math.max(romanCount, numericCount, alphaCount);
  if (maxCount < mainNodes.length * 0.3) return { ...DEFAULT_LINT_CONFIG.numbering };

  let format: 'numeric' | 'roman' | 'alpha' = 'numeric';
  if (romanCount >= numericCount && romanCount >= alphaCount) format = 'roman';
  else if (alphaCount >= numericCount) format = 'alpha';

  const sectionTriggers = topology.sections
    .map((s) => s.triggerName)
    .filter((n): n is string => n !== null);

  return {
    enabled: true,
    format,
    startFrom: detectStartFrom(sectionTriggers, mainNodes),
    sectionPattern: '{number}. {label}',
    nodePattern: detectNodePattern(mainNodes, format),
  };
}

function buildPositionMap(nodes: LintableNode[]): Map<string, [number, number]> {
  const positions = new Map<string, [number, number]>();
  for (const node of nodes) {
    if (node.type !== STICKY_NOTE_TYPE) {
      positions.set(node.name, node.position);
    }
  }
  return positions;
}

function detectDirection(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
): 'horizontal' | 'vertical' {
  let horizontalVotes = 0;
  let verticalVotes = 0;

  for (const [, graphNode] of topology.nodes) {
    const sourcePos = positions.get(graphNode.name);
    if (!sourcePos) continue;

    for (const targetName of graphNode.outgoingMain) {
      const targetPos = positions.get(targetName);
      if (!targetPos) continue;

      const dx = Math.abs(targetPos[0] - sourcePos[0]);
      const dy = Math.abs(targetPos[1] - sourcePos[1]);

      if (dx > dy) horizontalVotes++;
      else if (dy > dx) verticalVotes++;
    }
  }

  return verticalVotes > horizontalVotes ? 'vertical' : 'horizontal';
}

function measureNodeEdgeSpacing(
  graphNode: { name: string; depth: number; outgoingMain: string[] },
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
  mainAxis: (pos: [number, number]) => number,
): number[] {
  const sourcePos = positions.get(graphNode.name);
  if (!sourcePos) return [];

  const result: number[] = [];
  for (const targetName of graphNode.outgoingMain) {
    const targetNode = topology.nodes.get(targetName);
    if (!targetNode || targetNode.subNodeParent) continue;
    const targetPos = positions.get(targetName);
    if (!targetPos || targetNode.depth <= graphNode.depth) continue;

    const spacing = Math.abs(mainAxis(targetPos) - mainAxis(sourcePos));
    if (spacing > 0) result.push(spacing);
  }
  return result;
}

function collectNodeSpacings(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
  mainAxis: (pos: [number, number]) => number,
): number[] {
  const spacings: number[] = [];
  for (const [, graphNode] of topology.nodes) {
    if (graphNode.subNodeParent) continue;
    spacings.push(...measureNodeEdgeSpacing(graphNode, topology, positions, mainAxis));
  }
  return spacings;
}

function consecutiveDifferences(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs((sorted[i] ?? 0) - (sorted[i - 1] ?? 0));
    if (diff > 0) diffs.push(diff);
  }
  return diffs;
}

function groupNodesByDepth(
  nodeNames: string[],
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
): Map<number, [number, number][]> {
  const groups = new Map<number, [number, number][]>();
  for (const nodeName of nodeNames) {
    const graphNode = topology.nodes.get(nodeName);
    const pos = positions.get(nodeName);
    if (!graphNode || !pos || graphNode.subNodeParent) continue;
    const group = groups.get(graphNode.depth) ?? [];
    group.push(pos);
    groups.set(graphNode.depth, group);
  }
  return groups;
}

function collectBranchSpacings(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
  crossAxis: (pos: [number, number]) => number,
): number[] {
  const spacings: number[] = [];
  for (const section of topology.sections) {
    const depthGroups = groupNodesByDepth(section.nodeNames, topology, positions);
    for (const [, groupPositions] of depthGroups) {
      if (groupPositions.length < 2) continue;
      spacings.push(...consecutiveDifferences(groupPositions.map(crossAxis)));
    }
  }
  return spacings;
}

function collectSubNodeOffsets(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
  crossAxis: (pos: [number, number]) => number,
): number[] {
  const offsets: number[] = [];
  for (const [, graphNode] of topology.nodes) {
    if (!graphNode.subNodeParent) continue;
    const parentPos = positions.get(graphNode.subNodeParent);
    const subPos = positions.get(graphNode.name);
    if (!parentPos || !subPos) continue;
    const offset = Math.abs(crossAxis(subPos) - crossAxis(parentPos));
    if (offset > 0) offsets.push(offset);
  }
  return offsets;
}

function collectSubNodeSpacings(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
  mainAxis: (pos: [number, number]) => number,
): number[] {
  const spacings: number[] = [];
  for (const [, graphNode] of topology.nodes) {
    if (graphNode.subNodes.length < 2) continue;

    const subPositions = graphNode.subNodes
      .map((n) => positions.get(n))
      .filter((p): p is [number, number] => p !== undefined)
      .sort((a, b) => mainAxis(a) - mainAxis(b));

    spacings.push(...consecutiveDifferences(subPositions.map(mainAxis)));
  }
  return spacings;
}

function detectSectionGap(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
  crossAxis: (pos: [number, number]) => number,
): number {
  if (topology.sections.length <= 1) return DEFAULT_LINT_CONFIG.layout.sectionGap;

  const gaps: number[] = [];
  for (let i = 1; i < topology.sections.length; i++) {
    const prevSection = topology.sections[i - 1];
    const currSection = topology.sections[i];
    if (!prevSection || !currSection) continue;

    const prevValues = prevSection.nodeNames
      .map((n) => positions.get(n))
      .filter((p): p is [number, number] => p !== undefined)
      .map(crossAxis);
    const currValues = currSection.nodeNames
      .map((n) => positions.get(n))
      .filter((p): p is [number, number] => p !== undefined)
      .map(crossAxis);

    if (prevValues.length > 0 && currValues.length > 0) {
      const gap = Math.min(...currValues) - Math.max(...prevValues);
      if (gap > 0) gaps.push(gap);
    }
  }

  return gaps.length > 0 ? median(gaps) : DEFAULT_LINT_CONFIG.layout.sectionGap;
}

function detectGrid(positions: Map<string, [number, number]>): {
  snapToGrid: boolean;
  gridSize: number;
} {
  const allValues: number[] = [];
  for (const [, pos] of positions) {
    allValues.push(pos[0], pos[1]);
  }
  const posGcd = gcdOfArray(allValues);
  const hasGrid = posGcd >= MIN_GRID_SIZE;
  return {
    snapToGrid: hasGrid,
    gridSize: hasGrid ? posGcd : DEFAULT_LINT_CONFIG.layout.gridSize,
  };
}

function extractLayout(
  nodes: LintableNode[],
  topology: TopologyResult,
): {
  direction: 'horizontal' | 'vertical';
  nodeSpacing: number;
  branchSpacing: number;
  subNodeOffset: number;
  subNodeSpacing: number;
  sectionGap: number;
  snapToGrid: boolean;
  gridSize: number;
} {
  const positions = buildPositionMap(nodes);
  const direction = detectDirection(topology, positions);
  const isVertical = direction === 'vertical';

  const mainAxis = (pos: [number, number]) => (isVertical ? pos[1] : pos[0]);
  const crossAxis = (pos: [number, number]) => (isVertical ? pos[0] : pos[1]);

  const nodeSpacings = collectNodeSpacings(topology, positions, mainAxis);
  const branchSpacings = collectBranchSpacings(topology, positions, crossAxis);
  const subOffsets = collectSubNodeOffsets(topology, positions, crossAxis);
  const subSpacings = collectSubNodeSpacings(topology, positions, mainAxis);
  const sectionGap = detectSectionGap(topology, positions, crossAxis);
  const grid = detectGrid(positions);

  return {
    direction,
    nodeSpacing: median(nodeSpacings) || DEFAULT_LINT_CONFIG.layout.nodeSpacing,
    branchSpacing: median(branchSpacings) || DEFAULT_LINT_CONFIG.layout.branchSpacing,
    subNodeOffset: median(subOffsets) || DEFAULT_LINT_CONFIG.layout.subNodeOffset,
    subNodeSpacing: median(subSpacings) || DEFAULT_LINT_CONFIG.layout.subNodeSpacing,
    sectionGap,
    ...grid,
  };
}

function extractNaming(
  nodes: LintableNode[],
  numberingFormat: string | null,
): {
  enabled: boolean;
  removeNumberSuffix: boolean;
  titleCase: boolean;
  customNames: Record<string, string>;
  preserveCustom: boolean;
  excludeTypes: string[];
} {
  const mainNodes = nodes.filter((n) => n.type !== STICKY_NOTE_TYPE);
  if (mainNodes.length === 0) return { ...DEFAULT_LINT_CONFIG.naming };

  const customNames: Record<string, string> = {};
  let titleCaseCount = 0;
  let nonTitleCaseCount = 0;
  let hasNumberSuffix = false;
  const seenTypes = new Set<string>();

  for (const node of mainNodes) {
    const cleanName = numberingFormat ? stripNumberingPrefix(node.name).stripped : node.name;

    const defaultName = getDefaultName(node.type);
    const nameWithoutSuffix = cleanName.replace(/\s+\d+$/, '').trim();
    const isDefault =
      nameWithoutSuffix.toLowerCase() === defaultName.toLowerCase() ||
      cleanName.toLowerCase() === defaultName.toLowerCase();

    if (cleanName !== nameWithoutSuffix) hasNumberSuffix = true;

    if (!isDefault && !seenTypes.has(node.type)) {
      customNames[node.type] = cleanName;
      seenTypes.add(node.type);
    }

    if (isTitleCase(cleanName)) titleCaseCount++;
    else nonTitleCaseCount++;
  }

  return {
    enabled: true,
    removeNumberSuffix: !hasNumberSuffix,
    titleCase: titleCaseCount >= nonTitleCaseCount,
    customNames,
    preserveCustom: true,
    excludeTypes: [],
  };
}

function detectStickyGrouping(
  stickyCount: number,
  sectionCount: number,
  mainNodeCount: number,
): 'section' | 'node' {
  if (stickyCount <= sectionCount || mainNodeCount === 0) return 'section';
  const sectionDiff = Math.abs(stickyCount - sectionCount);
  const nodeDiff = Math.abs(stickyCount - mainNodeCount);
  return nodeDiff < sectionDiff ? 'node' : 'section';
}

function findDominantColor(stickyNodes: LintableNode[]): {
  dominantColor: string;
  allColors: string[];
} {
  const colorCounts = new Map<string, number>();
  const allColors: string[] = [];

  for (const sticky of stickyNodes) {
    const color = normalizeStickyColor(sticky.parameters.color as StickyColor | undefined);
    allColors.push(color);
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  }

  let dominantColor = N8N_DEFAULT_STICKY_HEX;
  let maxCount = 0;
  for (const [color, count] of colorCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }

  return { dominantColor, allColors };
}

function computeStickyPadding(
  stickyNodes: LintableNode[],
  nonStickyNodes: LintableNode[],
  nodeSizes: NodeSizeMap,
): { top: number; right: number; bottom: number; left: number } {
  const paddings = {
    top: [] as number[],
    right: [] as number[],
    bottom: [] as number[],
    left: [] as number[],
  };

  for (const sticky of stickyNodes) {
    const sX = sticky.position[0];
    const sY = sticky.position[1];
    const sW = (sticky.parameters.width as number) ?? 300;
    const sH = (sticky.parameters.height as number) ?? 200;

    const contained = nonStickyNodes.filter((n) => {
      const size = getNodeSize(n.name, nodeSizes);
      return (
        n.position[0] >= sX &&
        n.position[1] >= sY &&
        n.position[0] + size.width <= sX + sW &&
        n.position[1] + size.height <= sY + sH
      );
    });
    if (contained.length === 0) continue;

    const minX = Math.min(...contained.map((n) => n.position[0]));
    const minY = Math.min(...contained.map((n) => n.position[1]));
    const maxRightEdge = Math.max(
      ...contained.map((n) => n.position[0] + getNodeSize(n.name, nodeSizes).width),
    );
    const maxBottomEdge = Math.max(
      ...contained.map((n) => n.position[1] + getNodeSize(n.name, nodeSizes).height),
    );

    paddings.left.push(minX - sX);
    paddings.top.push(minY - sY);
    paddings.right.push(sX + sW - maxRightEdge);
    paddings.bottom.push(sY + sH - maxBottomEdge);
  }

  return {
    top: median(paddings.top) || DEFAULT_LINT_CONFIG.stickyNotes.padding.top,
    right: median(paddings.right) || DEFAULT_LINT_CONFIG.stickyNotes.padding.right,
    bottom: median(paddings.bottom) || DEFAULT_LINT_CONFIG.stickyNotes.padding.bottom,
    left: median(paddings.left) || DEFAULT_LINT_CONFIG.stickyNotes.padding.left,
  };
}

function inferTitlePattern(content: string): string {
  const headingMatch = content.match(/^(#{1,3}\s+)/);
  const prefix = headingMatch?.[1] ?? '## ';
  const body = content.slice(prefix.length);

  const hasNumbering = /^(\d+|[IVXLCDM]+|[A-Z])\.\s+/.test(body);
  if (hasNumbering) return `${prefix}{number}. {label}`;
  if (body.trim().length > 0) return `${prefix}{label}`;
  return DEFAULT_LINT_CONFIG.stickyNotes.titlePattern;
}

function stripLabelPrefixes(content: string): string {
  return content
    .replace(/^#{1,3}\s+/, '')
    .replace(/^(\d+|[IVXLCDM]+|[A-Z])\.\s+/, '')
    .trim();
}

function inferLabelSource(
  stickyNodes: LintableNode[],
  topology: TopologyResult,
): 'firstNode' | 'triggerType' | 'custom' {
  const triggerNames = topology.sections
    .map((s) => s.triggerName)
    .filter((n): n is string => n !== null);
  const firstNodeNames = topology.sections
    .map((s) => s.nodeNames[0])
    .filter((n): n is string => n !== undefined);

  let triggerMatches = 0;
  let firstNodeMatches = 0;

  for (const sticky of stickyNodes) {
    const label = stripLabelPrefixes((sticky.parameters.content as string) ?? '');
    if (triggerNames.some((name) => label.includes(name))) triggerMatches++;
    if (firstNodeNames.some((name) => label.includes(name))) firstNodeMatches++;
  }

  if (triggerMatches > firstNodeMatches && triggerMatches > 0) return 'triggerType';
  return 'firstNode';
}

function findContainedNodeNames(
  sticky: LintableNode,
  nonStickyNodes: LintableNode[],
  nodeSizes: NodeSizeMap,
): string[] {
  const sX = sticky.position[0];
  const sY = sticky.position[1];
  const sW = (sticky.parameters.width as number) ?? 300;
  const sH = (sticky.parameters.height as number) ?? 200;

  return nonStickyNodes
    .filter((n) => {
      const size = getNodeSize(n.name, nodeSizes);
      return (
        n.position[0] >= sX &&
        n.position[1] >= sY &&
        n.position[0] + size.width <= sX + sW &&
        n.position[1] + size.height <= sY + sH
      );
    })
    .map((n) => n.name);
}

function buildColorMappings(
  stickyNodes: LintableNode[],
  nonStickyNodes: LintableNode[],
  allColors: string[],
  dominantColor: string,
  topology: TopologyResult,
  nodeSizes: NodeSizeMap,
): { colors: Record<string, string>; colorRules: StickyNoteRule[] } {
  const colors: Record<string, string> = {};
  const colorRules: StickyNoteRule[] = [];
  const seenRoles = new Set<string>();

  for (let i = 0; i < allColors.length; i++) {
    const color = allColors[i] ?? dominantColor;
    if (color === dominantColor) continue;

    const sticky = stickyNodes[i];
    if (!sticky) continue;

    const containedNames = findContainedNodeNames(sticky, nonStickyNodes, nodeSizes);
    const matchedRole = tryMatchRoleColor(containedNames, color, topology, colorRules, seenRoles);

    if (!matchedRole) {
      storeLabelColor(sticky, i, color, colors);
    }
  }

  return { colors, colorRules };
}

function tryMatchRoleColor(
  containedNames: string[],
  color: string,
  topology: TopologyResult,
  colorRules: StickyNoteRule[],
  seenRoles: Set<string>,
): boolean {
  for (const nodeName of containedNames) {
    const graphNode = topology.nodes.get(nodeName);
    if (!graphNode || graphNode.subNodeParent) continue;

    if (
      (graphNode.role === 'trigger' || graphNode.role === 'terminal') &&
      !seenRoles.has(graphNode.role)
    ) {
      colorRules.push({ roles: [graphNode.role], color });
      seenRoles.add(graphNode.role);
      return true;
    }
  }
  return false;
}

function storeLabelColor(
  sticky: LintableNode,
  index: number,
  color: string,
  colors: Record<string, string>,
): void {
  const label = stripLabelPrefixes((sticky.parameters.content as string) ?? '');
  if (label) {
    colors[label] = color;
  } else {
    colors[String(index)] = color;
  }
}

function extractStickyNotes(
  nodes: LintableNode[],
  topology: TopologyResult,
  nodeSizes: NodeSizeMap,
): {
  enabled: boolean;
  removeExisting: boolean;
  grouping: 'section' | 'node';
  titlePattern: string;
  color: string;
  colors: Record<string, string>;
  colorRules: StickyNoteRule[];
  minWidth: number;
  minHeight: number;
  padding: { top: number; right: number; bottom: number; left: number };
  labelSource: 'firstNode' | 'triggerType' | 'custom';
  customLabels: Record<string, string>;
} {
  const stickyNodes = nodes.filter((n) => n.type === STICKY_NOTE_TYPE);
  const nonStickyNodes = nodes.filter((n) => n.type !== STICKY_NOTE_TYPE);

  if (stickyNodes.length === 0) {
    return { ...DEFAULT_LINT_CONFIG.stickyNotes, colorRules: [] };
  }

  const mainNodeCount = nonStickyNodes.filter(
    (n) => !topology.nodes.get(n.name)?.subNodeParent,
  ).length;
  const grouping = detectStickyGrouping(
    stickyNodes.length,
    topology.sections.length,
    mainNodeCount,
  );

  const { dominantColor, allColors } = findDominantColor(stickyNodes);

  const { colors, colorRules } = buildColorMappings(
    stickyNodes,
    nonStickyNodes,
    allColors,
    dominantColor,
    topology,
    nodeSizes,
  );

  const padding = computeStickyPadding(stickyNodes, nonStickyNodes, nodeSizes);
  const sampleContent = stickyNodes[0]?.parameters.content as string | undefined;
  const titlePattern = sampleContent
    ? inferTitlePattern(sampleContent)
    : DEFAULT_LINT_CONFIG.stickyNotes.titlePattern;
  const labelSource = inferLabelSource(stickyNodes, topology);

  const widths = stickyNodes.map((n) => (n.parameters.width as number) ?? 0).filter((w) => w > 0);
  const heights = stickyNodes.map((n) => (n.parameters.height as number) ?? 0).filter((h) => h > 0);

  return {
    enabled: true,
    removeExisting: true,
    grouping,
    titlePattern,
    color: dominantColor,
    colors,
    colorRules,
    minWidth: widths.length > 0 ? Math.min(...widths) : 0,
    minHeight: heights.length > 0 ? Math.min(...heights) : 0,
    padding,
    labelSource,
    customLabels: {},
  };
}

function checkStraightenConnections(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
): { total: number; aligned: number } {
  let total = 0;
  let aligned = 0;

  for (const [, graphNode] of topology.nodes) {
    if (graphNode.incomingMain.length !== 1 || graphNode.outgoingMain.length !== 1) continue;
    if (graphNode.subNodeParent) continue;

    const predName = graphNode.incomingMain[0];
    if (!predName) continue;

    const predPos = positions.get(predName);
    const currentPos = positions.get(graphNode.name);
    if (!predPos || !currentPos) continue;

    total++;
    if (Math.abs(currentPos[1] - predPos[1]) <= ALIGNMENT_TOLERANCE) aligned++;
  }

  return { total, aligned };
}

function checkCenterBranches(
  topology: TopologyResult,
  positions: Map<string, [number, number]>,
): { total: number; aligned: number } {
  let total = 0;
  let aligned = 0;

  for (const [, graphNode] of topology.nodes) {
    if (graphNode.role !== 'merge-point' || graphNode.incomingMain.length < 2) continue;

    const incomingYs = graphNode.incomingMain
      .map((name) => positions.get(name)?.[1])
      .filter((y): y is number => y !== undefined);
    if (incomingYs.length < 2) continue;

    const avgY = incomingYs.reduce((a, b) => a + b, 0) / incomingYs.length;
    const currentPos = positions.get(graphNode.name);
    if (!currentPos) continue;

    total++;
    if (Math.abs(currentPos[1] - avgY) <= ALIGNMENT_TOLERANCE) aligned++;
  }

  return { total, aligned };
}

function extractAlignment(
  nodes: LintableNode[],
  topology: TopologyResult,
): {
  enabled: boolean;
  straightenConnections: boolean;
  centerBranches: boolean;
} {
  const positions = buildPositionMap(nodes);
  const straighten = checkStraightenConnections(topology, positions);
  const center = checkCenterBranches(topology, positions);

  const hasStraighten =
    straighten.total > 0 && straighten.aligned / straighten.total >= ALIGNMENT_THRESHOLD;
  const hasCenter = center.total > 0 && center.aligned / center.total >= ALIGNMENT_THRESHOLD;

  return {
    enabled: hasStraighten || hasCenter,
    straightenConnections: hasStraighten,
    centerBranches: hasCenter,
  };
}

function detectTriggerTypes(topology: TopologyResult): string[] {
  const triggerTypes: string[] = [];
  const seenTypes = new Set<string>();

  for (const section of topology.sections) {
    if (!section.triggerName) continue;
    const graphNode = topology.nodes.get(section.triggerName);
    if (!graphNode) continue;

    if (
      graphNode.role === 'trigger' &&
      !graphNode.type.toLowerCase().includes('trigger') &&
      !seenTypes.has(graphNode.type)
    ) {
      triggerTypes.push(graphNode.type);
      seenTypes.add(graphNode.type);
    }
  }

  return triggerTypes;
}

export function captureConfigFromWorkflow(
  nodes: LintableNode[],
  connections: ConnectionMap,
  nodeSizesById?: Map<string, NodeSize>,
): LintConfig {
  log.debug('Capturing config from workflow', { nodeCount: nodes.length });

  const nodeSizes = buildNodeSizesByName(nodes, nodeSizesById ?? new Map());
  const topology = analyzeTopology(nodes, connections);

  const layout = extractLayout(nodes, topology);
  const numbering = detectNumbering(nodes, topology);
  const naming = extractNaming(nodes, numbering.enabled ? numbering.format : null);
  const stickyNotes = extractStickyNotes(nodes, topology, nodeSizes);
  const alignment = extractAlignment(nodes, topology);
  const triggerTypes = detectTriggerTypes(topology);

  const config: LintConfig = {
    triggerTypes,
    layout: {
      enabled: true,
      ...layout,
      excludeTypes: [],
      pinNodes: [],
    },
    stickyNotes,
    naming,
    numbering,
    alignment,
    autoLint: { ...DEFAULT_LINT_CONFIG.autoLint },
  };

  log.debug('Config captured', {
    direction: config.layout.direction,
    nodeSpacing: config.layout.nodeSpacing,
    numberingEnabled: config.numbering.enabled,
    stickyEnabled: config.stickyNotes.enabled,
  });

  return config;
}

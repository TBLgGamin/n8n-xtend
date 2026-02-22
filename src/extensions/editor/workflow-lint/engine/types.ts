export interface LintableNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
  typeVersion?: number;
}

export interface ConnectionTarget {
  node: string;
  type: string;
  index: number;
}

export type ConnectionOutputs = Record<string, (ConnectionTarget[] | null)[]>;
export type ConnectionMap = Record<string, ConnectionOutputs>;

export interface LintableWorkflow {
  nodes: LintableNode[];
  connections: ConnectionMap;
}

export interface LayoutConfig {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  nodeSpacing: number;
  branchSpacing: number;
  subNodeOffset: number;
  subNodeSpacing: number;
  sectionGap: number;
  snapToGrid: boolean;
  gridSize: number;
  excludeTypes: string[];
  pinNodes: string[];
}

export type StickyColor = string | number;

export interface StickyNoteRule {
  roles?: NodeRole[];
  types?: string[];
  notRoles?: NodeRole[];
  notTypes?: string[];
  color: StickyColor;
}

export interface StickyNoteConfig {
  enabled: boolean;
  removeExisting: boolean;
  grouping: 'section' | 'node';
  titlePattern: string;
  color: StickyColor;
  colors: Record<string, StickyColor>;
  colorRules: StickyNoteRule[];
  minWidth: number;
  minHeight: number;
  padding: { top: number; right: number; bottom: number; left: number };
  labelSource: 'firstNode' | 'triggerType' | 'custom';
  customLabels: Record<string, string>;
}

export interface NamingConfig {
  enabled: boolean;
  removeNumberSuffix: boolean;
  titleCase: boolean;
  customNames: Record<string, string>;
  preserveCustom: boolean;
  excludeTypes: string[];
}

export interface NumberingConfig {
  enabled: boolean;
  startFrom: number;
  format: 'numeric' | 'roman' | 'alpha';
  sectionPattern: string;
  nodePattern: string;
}

export interface AlignmentConfig {
  enabled: boolean;
  straightenConnections: boolean;
  centerBranches: boolean;
}

export interface AutoLintConfig {
  enabled: boolean;
  delay: number;
}

export interface LintConfig {
  triggerTypes: string[];
  layout: LayoutConfig;
  stickyNotes: StickyNoteConfig;
  naming: NamingConfig;
  numbering: NumberingConfig;
  alignment: AlignmentConfig;
  autoLint: AutoLintConfig;
}

export type NodeRole = 'trigger' | 'terminal' | 'regular' | 'branch-point' | 'merge-point';

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  role: NodeRole;
  incomingMain: string[];
  outgoingMain: string[];
  subNodeParent: string | null;
  subNodes: string[];
  depth: number;
  sectionId: number;
}

export interface Section {
  id: number;
  name: string;
  triggerName: string | null;
  nodeNames: string[];
  subNodeNames: string[];
  branches: Branch[];
}

export interface Branch {
  nodeNames: string[];
  slot: number;
}

export interface TopologyResult {
  nodes: Map<string, GraphNode>;
  sections: Section[];
  disconnected: string[];
  hasCycles: boolean;
}

export interface NodeSize {
  width: number;
  height: number;
}

export type NodeSizeMap = Map<string, NodeSize>;

export interface LintResult {
  nodes: LintableNode[];
  connections: ConnectionMap;
  isModified: boolean;
  changes: string[];
}

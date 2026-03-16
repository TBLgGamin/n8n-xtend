import type { LintConfig, StickyColor } from './types';

const N8N_DEFAULT_COLOR_INDEX = 1;

export function normalizeStickyColor(color: StickyColor | undefined | null): StickyColor {
  if (color === undefined || color === null) return N8N_DEFAULT_COLOR_INDEX;
  return color;
}

export const DEFAULT_LINT_CONFIG: LintConfig = {
  triggerTypes: [],
  layout: {
    enabled: true,
    direction: 'horizontal',
    originX: 0,
    originY: 0,
    nodeSpacing: 280,
    branchSpacing: 200,
    subNodeOffset: 160,
    subNodeSpacing: 200,
    sectionGap: 400,
    minGap: 80,
    snapToGrid: true,
    gridSize: 20,
    excludeTypes: [],
    pinNodes: [],
    sectionOrder: 'discovery',
  },
  stickyNotes: {
    enabled: true,
    grouping: 'node',
    namePattern: 'Sticky Note - {label}',
    titlePattern: '## {number}. {label}',
    color: 1,
    colors: {},
    colorRules: [],
    minWidth: 0,
    minHeight: 0,
    maxWidth: 0,
    maxHeight: 0,
    padding: { top: 80, right: 40, bottom: 40, left: 40 },
    labelSource: 'firstNode',
    customLabels: {},
    rolePriority: {
      trigger: 5,
      'branch-point': 4,
      'merge-point': 3,
      terminal: 2,
      regular: 1,
    },
  },
  naming: {
    enabled: true,
    removeNumberSuffix: true,
    titleCase: true,
    preserveCustom: true,
    excludeTypes: [],
    collisionFormat: ' {n}',
  },
  numbering: {
    enabled: false,
    numberSections: true,
    numberNodes: true,
    startFrom: 1,
    format: 'numeric',
    sectionPattern: '{number}. {label}',
    nodePattern: '{number}. {name}',
  },
  alignment: {
    enabled: true,
    straightenConnections: true,
    centerBranches: true,
  },
  autoLint: {
    enabled: false,
    delay: 1000,
  },
};

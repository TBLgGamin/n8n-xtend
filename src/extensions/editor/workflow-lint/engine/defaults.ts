import type { LintConfig, StickyColor } from './types';

export const N8N_STICKY_COLOR_MAP: Record<number, string> = {
  1: '#332700',
  2: '#2D1D06',
  3: '#4F070D',
  4: '#0A291A',
  5: '#081A2B',
  6: '#211B50',
  7: '#212121',
};

export const N8N_DEFAULT_STICKY_HEX = '#332700';

export function normalizeStickyColor(color: StickyColor | undefined | null): string {
  if (color === undefined || color === null) return N8N_DEFAULT_STICKY_HEX;
  if (typeof color === 'string') return color;
  return N8N_STICKY_COLOR_MAP[color] ?? N8N_DEFAULT_STICKY_HEX;
}

export const DEFAULT_LINT_CONFIG: LintConfig = {
  triggerTypes: [],
  layout: {
    enabled: true,
    direction: 'horizontal',
    nodeSpacing: 280,
    branchSpacing: 200,
    subNodeOffset: 160,
    subNodeSpacing: 200,
    sectionGap: 400,
    snapToGrid: true,
    gridSize: 20,
    excludeTypes: [],
    pinNodes: [],
  },
  stickyNotes: {
    enabled: true,
    removeExisting: true,
    grouping: 'node',
    titlePattern: '## {number}. {label}',
    color: '#FFF5D6',
    colors: {},
    colorRules: [],
    minWidth: 0,
    minHeight: 0,
    padding: { top: 80, right: 40, bottom: 40, left: 40 },
    labelSource: 'firstNode',
    customLabels: {},
  },
  naming: {
    enabled: true,
    removeNumberSuffix: true,
    titleCase: true,
    customNames: {},
    preserveCustom: true,
    excludeTypes: [],
  },
  numbering: {
    enabled: false,
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

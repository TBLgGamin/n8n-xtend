import { getLocalItem, logger, sanitizeObject, setLocalItem } from '@/shared/utils';
import { DEFAULT_LINT_CONFIG } from '../engine/defaults';
import type { LintConfig, LintPositionMap, SectionOrder } from '../engine/types';

const log = logger.child('lint:config');

const STORAGE_KEY = 'n8n-xtend-lint-config';
const POSITIONS_KEY = 'n8n-xtend-lint-positions';

const VALID_DIRECTIONS = new Set<'horizontal' | 'vertical'>(['horizontal', 'vertical']);
const VALID_SECTION_ORDERS = new Set<SectionOrder>(['discovery', 'position', 'name']);
const VALID_FORMATS = new Set<'numeric' | 'roman' | 'alpha'>(['numeric', 'roman', 'alpha']);
const VALID_GROUPINGS = new Set<'section' | 'node'>(['section', 'node']);
const VALID_LABEL_SOURCES = new Set<'firstNode' | 'triggerType' | 'custom'>([
  'firstNode',
  'triggerType',
  'custom',
]);

function clampMin(value: unknown, min: number, fallback: number): number {
  return typeof value === 'number' && value >= min ? value : fallback;
}

function validateEnum<T extends string>(value: unknown, validSet: Set<T>, fallback: T): T {
  return validSet.has(value as T) ? (value as T) : fallback;
}

function validateLayoutConfig(validated: LintConfig, errors: string[]): void {
  const d = DEFAULT_LINT_CONFIG;
  if (!VALID_DIRECTIONS.has(validated.layout.direction)) {
    errors.push(`Invalid layout.direction "${validated.layout.direction}", using default`);
    validated.layout.direction = d.layout.direction;
  }
  if (validated.layout.gridSize < 1) {
    errors.push(`layout.gridSize must be >= 1, was ${validated.layout.gridSize}`);
    validated.layout.gridSize = clampMin(validated.layout.gridSize, 1, d.layout.gridSize);
  }
  if (validated.layout.nodeSpacing < 1) {
    errors.push(`layout.nodeSpacing must be >= 1, was ${validated.layout.nodeSpacing}`);
    validated.layout.nodeSpacing = clampMin(validated.layout.nodeSpacing, 1, d.layout.nodeSpacing);
  }
  if (validated.layout.branchSpacing < 1) {
    errors.push(`layout.branchSpacing must be >= 1, was ${validated.layout.branchSpacing}`);
    validated.layout.branchSpacing = clampMin(
      validated.layout.branchSpacing,
      1,
      d.layout.branchSpacing,
    );
  }
  if (validated.layout.sectionGap < 0) {
    errors.push(`layout.sectionGap must be >= 0, was ${validated.layout.sectionGap}`);
    validated.layout.sectionGap = clampMin(validated.layout.sectionGap, 0, d.layout.sectionGap);
  }
  if (validated.layout.minGap < 0) {
    errors.push(`layout.minGap must be >= 0, was ${validated.layout.minGap}`);
    validated.layout.minGap = clampMin(validated.layout.minGap, 0, d.layout.minGap);
  }
  if (typeof validated.layout.originX !== 'number' || !Number.isFinite(validated.layout.originX)) {
    errors.push('layout.originX must be a finite number, using default');
    validated.layout.originX = d.layout.originX;
  }
  if (typeof validated.layout.originY !== 'number' || !Number.isFinite(validated.layout.originY)) {
    errors.push('layout.originY must be a finite number, using default');
    validated.layout.originY = d.layout.originY;
  }
  validated.layout.sectionOrder = validateEnum(
    validated.layout.sectionOrder,
    VALID_SECTION_ORDERS,
    d.layout.sectionOrder,
  );
}

function validateStickyNotesConfig(validated: LintConfig, errors: string[]): void {
  const d = DEFAULT_LINT_CONFIG;
  validated.stickyNotes.grouping = validateEnum(
    validated.stickyNotes.grouping,
    VALID_GROUPINGS,
    d.stickyNotes.grouping,
  );
  validated.stickyNotes.labelSource = validateEnum(
    validated.stickyNotes.labelSource,
    VALID_LABEL_SOURCES,
    d.stickyNotes.labelSource,
  );
  if (typeof validated.stickyNotes.namePattern !== 'string' || !validated.stickyNotes.namePattern) {
    errors.push('stickyNotes.namePattern must be a non-empty string, using default');
    validated.stickyNotes.namePattern = d.stickyNotes.namePattern;
  }
  if (validated.stickyNotes.maxWidth < 0) {
    errors.push(`stickyNotes.maxWidth must be >= 0, was ${validated.stickyNotes.maxWidth}`);
    validated.stickyNotes.maxWidth = clampMin(
      validated.stickyNotes.maxWidth,
      0,
      d.stickyNotes.maxWidth,
    );
  }
  if (validated.stickyNotes.maxHeight < 0) {
    errors.push(`stickyNotes.maxHeight must be >= 0, was ${validated.stickyNotes.maxHeight}`);
    validated.stickyNotes.maxHeight = clampMin(
      validated.stickyNotes.maxHeight,
      0,
      d.stickyNotes.maxHeight,
    );
  }
}

export function validateLintConfig(config: LintConfig): { config: LintConfig; errors: string[] } {
  const errors: string[] = [];
  const validated = structuredClone(config);
  const d = DEFAULT_LINT_CONFIG;

  validateLayoutConfig(validated, errors);
  validateStickyNotesConfig(validated, errors);

  validated.numbering.format = validateEnum(
    validated.numbering.format,
    VALID_FORMATS,
    d.numbering.format,
  );
  if (validated.numbering.startFrom < 1) {
    errors.push(`numbering.startFrom must be >= 1, was ${validated.numbering.startFrom}`);
    validated.numbering.startFrom = clampMin(
      validated.numbering.startFrom,
      1,
      d.numbering.startFrom,
    );
  }

  if (
    typeof validated.naming.collisionFormat !== 'string' ||
    !validated.naming.collisionFormat.includes('{n}')
  ) {
    errors.push(`naming.collisionFormat must contain "{n}", using default`);
    validated.naming.collisionFormat = d.naming.collisionFormat;
  }

  if (validated.autoLint.delay < 0) {
    errors.push(`autoLint.delay must be >= 0, was ${validated.autoLint.delay}`);
    validated.autoLint.delay = clampMin(validated.autoLint.delay, 0, d.autoLint.delay);
  }
  if (validated.autoLint.delay > 60000) {
    errors.push(`autoLint.delay must be <= 60000, was ${validated.autoLint.delay}`);
    validated.autoLint.delay = 60000;
  }

  if (errors.length > 0) {
    log.warn('Config validation issues', { errors });
  }

  return { config: validated, errors };
}

export function loadLintConfig(): LintConfig {
  const raw = getLocalItem<Partial<LintConfig>>(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_LINT_CONFIG };
  const stored = sanitizeObject(raw) as Partial<LintConfig>;

  const merged: LintConfig = {
    triggerTypes: stored.triggerTypes ?? DEFAULT_LINT_CONFIG.triggerTypes,
    layout: { ...DEFAULT_LINT_CONFIG.layout, ...stored.layout },
    stickyNotes: {
      ...DEFAULT_LINT_CONFIG.stickyNotes,
      ...stored.stickyNotes,
      colors: {
        ...DEFAULT_LINT_CONFIG.stickyNotes.colors,
        ...stored.stickyNotes?.colors,
      },
      colorRules: stored.stickyNotes?.colorRules ?? DEFAULT_LINT_CONFIG.stickyNotes.colorRules,
      padding: {
        ...DEFAULT_LINT_CONFIG.stickyNotes.padding,
        ...stored.stickyNotes?.padding,
      },
      customLabels: {
        ...DEFAULT_LINT_CONFIG.stickyNotes.customLabels,
        ...stored.stickyNotes?.customLabels,
      },
      rolePriority: {
        ...DEFAULT_LINT_CONFIG.stickyNotes.rolePriority,
        ...stored.stickyNotes?.rolePriority,
      },
    },
    naming: { ...DEFAULT_LINT_CONFIG.naming, ...stored.naming },
    numbering: { ...DEFAULT_LINT_CONFIG.numbering, ...stored.numbering },
    alignment: { ...DEFAULT_LINT_CONFIG.alignment, ...stored.alignment },
    autoLint: { ...DEFAULT_LINT_CONFIG.autoLint, ...stored.autoLint },
  };

  return validateLintConfig(merged).config;
}

export function saveLintConfig(config: LintConfig): void {
  setLocalItem(STORAGE_KEY, config);
  log.debug('Lint config saved');
}

export function loadLintPositions(workflowId: string): LintPositionMap {
  const all = getLocalItem<Record<string, LintPositionMap>>(POSITIONS_KEY);
  return all?.[workflowId] ?? {};
}

export function saveLintPositions(workflowId: string, positions: LintPositionMap): void {
  const all = getLocalItem<Record<string, LintPositionMap>>(POSITIONS_KEY) ?? {};
  all[workflowId] = positions;
  setLocalItem(POSITIONS_KEY, all);
}

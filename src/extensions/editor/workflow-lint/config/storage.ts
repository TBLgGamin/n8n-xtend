import { getLocalItem, logger, setLocalItem } from '@/shared/utils';
import { DEFAULT_LINT_CONFIG } from '../engine/defaults';
import type { LintConfig } from '../engine/types';

const log = logger.child('lint:config');

const STORAGE_KEY = 'n8n-xtend-lint-config';

export function loadLintConfig(): LintConfig {
  const stored = getLocalItem<Partial<LintConfig>>(STORAGE_KEY);
  if (!stored) return { ...DEFAULT_LINT_CONFIG };

  return {
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
    },
    naming: { ...DEFAULT_LINT_CONFIG.naming, ...stored.naming },
    numbering: { ...DEFAULT_LINT_CONFIG.numbering, ...stored.numbering },
    alignment: { ...DEFAULT_LINT_CONFIG.alignment, ...stored.alignment },
    autoLint: { ...DEFAULT_LINT_CONFIG.autoLint, ...stored.autoLint },
  };
}

export function saveLintConfig(config: LintConfig): void {
  setLocalItem(STORAGE_KEY, config);
  log.debug('Lint config saved');
}

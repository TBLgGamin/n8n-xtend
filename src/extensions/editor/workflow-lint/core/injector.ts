import {
  createDebounced,
  emit,
  getWorkflowIdFromUrl,
  logger,
  registerUndo,
  showToast,
} from '@/shared/utils';
import { fetchWorkflowForLint, fetchWorkflowVersionId, saveLintedWorkflow } from '../api';
import { loadLintConfig, showLintDialog } from '../config';
import { lintWorkflow } from '../engine';
import type { ConnectionMap, LintableNode } from '../engine/types';
import { measureNodeDimensions } from './measure';

const log = logger.child('lint:injector');

function getExistingMenuItemClasses(menu: HTMLElement): {
  itemClass: string;
  containerClass: string;
  labelClass: string;
} {
  const existingItem = menu.querySelector('li[class*="_elementItem"]');
  const existingContainer = menu.querySelector('div[class*="_itemContainer"]');
  const existingLabel = menu.querySelector('span[class*="_label"]');

  return {
    itemClass: existingItem?.className || 'el-dropdown-menu__item',
    containerClass: existingContainer?.className || '',
    labelClass: existingLabel?.className || '',
  };
}

function createMenuItem(menu: HTMLElement, label: string): HTMLLIElement {
  const classes = getExistingMenuItemClasses(menu);

  const li = document.createElement('li');
  li.className = classes.itemClass;
  li.setAttribute('data-el-collection-item', '');
  li.setAttribute('tabindex', '-1');
  li.setAttribute('aria-disabled', 'false');
  li.setAttribute('role', 'menuitem');

  const container = document.createElement('div');
  container.className = classes.containerClass;

  const span = document.createElement('span');
  span.className = classes.labelClass;
  span.textContent = label;

  container.appendChild(span);
  li.appendChild(container);

  return li;
}

function attachEventBlockers(item: HTMLLIElement, handler: (e: Event) => void): void {
  item.addEventListener('click', handler, true);
  item.addEventListener('mousedown', (e) => e.stopPropagation(), true);
  item.addEventListener('mouseup', (e) => e.stopPropagation(), true);
  item.addEventListener('pointerdown', (e) => e.stopPropagation(), true);
  item.addEventListener('pointerup', (e) => e.stopPropagation(), true);
}

async function runLint(): Promise<void> {
  const workflowId = getWorkflowIdFromUrl();
  if (!workflowId) {
    showToast({ message: 'No workflow detected' });
    return;
  }

  const workflowData = await fetchWorkflowForLint(workflowId);
  if (!workflowData) {
    showToast({ message: 'Failed to fetch workflow' });
    return;
  }

  const nodeSizes = measureNodeDimensions();
  const config = loadLintConfig();
  const result = lintWorkflow(
    { nodes: workflowData.nodes, connections: workflowData.connections },
    config,
    nodeSizes,
  );

  if (!result.isModified) {
    showToast({ message: 'Workflow already clean' });
    return;
  }

  const originalNodes = workflowData.nodes;
  const originalConnections = workflowData.connections;

  const saved = await saveLintedWorkflow(
    workflowId,
    workflowData.versionId,
    result.nodes,
    result.connections,
  );
  if (!saved) {
    showToast({ message: 'Failed to save linted workflow' });
    return;
  }

  emit('workflow-lint:applied', { workflowId, changes: result.changes });
  log.debug('Workflow linted', { workflowId, changes: result.changes });

  registerUndo({
    description: 'Lint workflow',
    undo: async () => {
      const freshVersionId = await fetchWorkflowVersionId(workflowId);
      if (!freshVersionId) return false;
      const restored = await saveLintedWorkflow(
        workflowId,
        freshVersionId,
        originalNodes as LintableNode[],
        originalConnections as ConnectionMap,
      );
      if (restored) window.location.reload();
      return restored;
    },
  });

  window.location.reload();
}

const debouncedAutoLint = createDebounced(() => {
  runLint();
}, 500);

export function handleAutoLintSave(): void {
  const config = loadLintConfig();
  if (!config.autoLint.enabled) return;

  setTimeout(() => {
    debouncedAutoLint();
  }, config.autoLint.delay);
}

export function injectLintMenuItems(menu: HTMLElement, referenceItem: HTMLElement): void {
  const lintItem = createMenuItem(menu, 'Lint');

  attachEventBlockers(lintItem, (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const popper = menu.closest('.el-dropdown__popper') as HTMLElement;
    if (popper) popper.style.display = 'none';

    showLintDialog(runLint);
  });

  const referenceLi = referenceItem.closest('li');
  if (referenceLi) {
    referenceLi.after(lintItem);
  } else {
    referenceItem.after(lintItem);
  }

  log.debug('Lint menu item injected');
}

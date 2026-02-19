import type { Workflow } from '@/shared/types';
import {
  buildWorkflowUrl,
  escapeHtml,
  getWorkflowIdFromUrl,
  isValidId,
  logger,
} from '@/shared/utils';
import { isItemSelected, setupDraggable } from '../core/dragdrop';
import { icons } from '../icons';
import { handleItemClick } from './selection';

const log = logger.child('folder-tree:components:workflow');

export function createWorkflowElement(workflow: Workflow): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-xtend-folder-tree-node';
  node.dataset.workflowId = workflow.id;

  if (!isValidId(workflow.id)) {
    log.debug('Invalid workflow ID encountered', { workflowId: workflow.id });
    node.innerHTML = '<div class="n8n-xtend-folder-tree-error">Invalid workflow</div>';
    return node;
  }

  const isActive = getWorkflowIdFromUrl() === workflow.id;
  const workflowUrl = buildWorkflowUrl(workflow.id);

  node.innerHTML = `
    <a href="${escapeHtml(workflowUrl)}" class="n8n-xtend-folder-tree-item${isActive ? ' active' : ''}${isItemSelected(workflow.id) ? ' n8n-xtend-folder-tree-selected' : ''}" title="${escapeHtml(workflow.name)}">
      <span class="n8n-xtend-folder-tree-spacer"></span>
      <span class="n8n-xtend-folder-tree-icon workflow">${icons.workflow}</span>
      <span class="n8n-xtend-folder-tree-label">${escapeHtml(workflow.name)}</span>
    </a>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-xtend-folder-tree-item');
  if (item) {
    setupDraggable(item, 'workflow', workflow.id, workflow.name, workflow.parentFolderId);

    item.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        handleItemClick(workflow.id, event);
      }
    });
  }

  return node;
}

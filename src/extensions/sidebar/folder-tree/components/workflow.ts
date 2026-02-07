import type { Workflow } from '@/shared/types';
import { buildWorkflowUrl, escapeHtml, getWorkflowIdFromUrl, isValidId } from '@/shared/utils';
import { setupDraggable } from '../core/dragdrop';
import { icons } from '../icons';

export function createWorkflowElement(workflow: Workflow): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-xtend-folder-tree-node';
  node.dataset.workflowId = workflow.id;

  if (!isValidId(workflow.id)) {
    node.innerHTML = '<div class="n8n-xtend-folder-tree-error">Invalid workflow</div>';
    return node;
  }

  const isActive = getWorkflowIdFromUrl() === workflow.id;
  const workflowUrl = buildWorkflowUrl(workflow.id);

  node.innerHTML = `
    <a href="${escapeHtml(workflowUrl)}" class="n8n-xtend-folder-tree-item${isActive ? ' active' : ''}" title="${escapeHtml(workflow.name)}">
      <span class="n8n-xtend-folder-tree-spacer"></span>
      <span class="n8n-xtend-folder-tree-icon workflow">${icons.workflow}</span>
      <span class="n8n-xtend-folder-tree-label">${escapeHtml(workflow.name)}</span>
    </a>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-xtend-folder-tree-item');
  if (item) {
    setupDraggable(item, 'workflow', workflow.id, workflow.name, workflow.parentFolderId);
  }

  return node;
}

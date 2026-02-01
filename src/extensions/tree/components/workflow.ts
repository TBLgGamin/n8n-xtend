import type { Workflow } from '@/shared/types';
import { buildWorkflowUrl, getWorkflowIdFromUrl } from '@/shared/utils';
import { setupDraggable } from '../core/dragdrop';
import { icons } from '../icons';

export function createWorkflowElement(workflow: Workflow): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-tree-node';
  node.dataset.workflowId = workflow.id;

  const isActive = getWorkflowIdFromUrl() === workflow.id;
  const workflowUrl = buildWorkflowUrl(workflow.id);

  node.innerHTML = `
    <a href="${workflowUrl}" class="n8n-tree-item${isActive ? ' active' : ''}" title="${escapeHtml(workflow.name)}">
      <span class="n8n-tree-spacer"></span>
      <span class="n8n-tree-icon workflow">${icons.workflow}</span>
      <span class="n8n-tree-label">${escapeHtml(workflow.name)}</span>
    </a>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-tree-item');
  if (item) {
    setupDraggable(item, 'workflow', workflow.id, workflow.name, workflow.parentFolderId);
  }

  return node;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

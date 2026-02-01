import type { Workflow } from '@/shared/types';
import { copyToClipboard, showContextMenu } from '@/shared/ui';
import { buildWorkflowUrl, getWorkflowIdFromUrl } from '@/shared/utils';
import { icons } from '../icons';

export function createWorkflowElement(workflow: Workflow): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-tree-node';

  const isActive = getWorkflowIdFromUrl() === workflow.id;
  const workflowUrl = buildWorkflowUrl(workflow.id);

  node.innerHTML = `
    <div class="n8n-tree-item${isActive ? ' active' : ''}">
      <span class="n8n-tree-spacer"></span>
      <span class="n8n-tree-icon workflow">${icons.workflow}</span>
      <span class="n8n-tree-label" title="${escapeHtml(workflow.name)}">${escapeHtml(workflow.name)}</span>
    </div>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-tree-item');
  if (item) {
    item.onclick = () => {
      location.href = workflowUrl;
    };

    item.oncontextmenu = (event) => {
      showContextMenu(event, [
        {
          label: 'Open in new tab',
          action: () => window.open(workflowUrl, '_blank'),
        },
        {
          label: 'Copy link',
          action: () => copyToClipboard(workflowUrl),
        },
      ]);
    };
  }

  return node;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

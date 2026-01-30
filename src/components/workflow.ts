import { icons } from '../icons';
import { buildWorkflowUrl } from '../utils/url';
import type { Workflow } from '../types';

export function createWorkflowElement(workflow: Workflow): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'n8n-tree-node';

  node.innerHTML = `
    <div class="n8n-tree-item">
      <span class="n8n-tree-spacer"></span>
      <span class="n8n-tree-icon workflow">${icons.workflow}</span>
      <span class="n8n-tree-label">${escapeHtml(workflow.name)}</span>
    </div>
  `;

  const item = node.querySelector<HTMLElement>('.n8n-tree-item');
  if (item) {
    item.onclick = () => {
      location.href = buildWorkflowUrl(workflow.id);
    };
  }

  return node;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

import type { WorkflowDetail } from '@/shared/types';
import { buildWorkflowUrl, isValidId } from '@/shared/utils';
import { icons } from '../icons';

const CARD_WIDTH = 220;
const ROW_HEIGHT = 140;
const GAP = 24;
const MAX_COLUMNS = 6;

export function extractTriggerInputNames(workflow: WorkflowDetail): string[] {
  const triggerNode = workflow.nodes.find(
    (node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
  );
  if (!triggerNode) return [];

  const workflowInputs = triggerNode.parameters.workflowInputs as
    | { values?: { name?: string }[] }
    | undefined;

  if (!workflowInputs?.values) return [];

  return workflowInputs.values
    .map((v) => v.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function createCardElement(
  workflow: WorkflowDetail,
  left: number,
  top: number,
): HTMLDivElement | null {
  if (!isValidId(workflow.id)) return null;

  const card = document.createElement('div');
  card.className = 'n8n-xtend-graph-card';
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;

  const link = document.createElement('a');
  link.className = 'n8n-xtend-graph-card-link';
  link.href = buildWorkflowUrl(workflow.id);

  const header = document.createElement('div');
  header.className = 'n8n-xtend-graph-card-header';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'n8n-xtend-graph-card-icon';
  iconDiv.innerHTML = icons.workflow;

  const nameDiv = document.createElement('div');
  nameDiv.className = 'n8n-xtend-graph-card-name';
  nameDiv.textContent = workflow.name;

  header.appendChild(iconDiv);
  header.appendChild(nameDiv);
  link.appendChild(header);

  const inputNames = extractTriggerInputNames(workflow);
  if (inputNames.length > 0) {
    const inputsDiv = document.createElement('div');
    inputsDiv.className = 'n8n-xtend-graph-card-inputs';
    for (const name of inputNames) {
      const pill = document.createElement('span');
      pill.className = 'n8n-xtend-graph-card-input';
      pill.textContent = name;
      inputsDiv.appendChild(pill);
    }
    link.appendChild(inputsDiv);
  }

  card.appendChild(link);
  return card;
}

export function renderWorkflowCards(
  transformLayer: HTMLElement,
  workflows: Map<string, WorkflowDetail>,
): void {
  const sorted = [...workflows.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  const columns = Math.min(MAX_COLUMNS, Math.max(1, sorted.length));
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < sorted.length; i++) {
    const workflow = sorted[i];
    if (!workflow) continue;
    const col = i % columns;
    const row = Math.floor(i / columns);
    const left = col * (CARD_WIDTH + GAP);
    const top = row * ROW_HEIGHT;

    const card = createCardElement(workflow, left, top);
    if (card) fragment.appendChild(card);
  }

  transformLayer.appendChild(fragment);
}

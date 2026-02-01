import type { Workflow } from '@/shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { createWorkflowElement } from './workflow';

function mockLocation(
  pathname: string,
  origin = 'http://localhost:5678',
  hostname = 'localhost',
): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, origin, hostname },
    writable: true,
    configurable: true,
  });
}

describe('createWorkflowElement', () => {
  beforeEach(() => {
    mockLocation('/projects/proj-1/workflows');
    document.body.innerHTML = '';
  });

  it('creates workflow element with correct structure', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
    };

    const element = createWorkflowElement(workflow);

    expect(element.tagName).toBe('DIV');
    expect(element.className).toBe('n8n-tree-node');
    expect(element.dataset.workflowId).toBe('wf-1');
  });

  it('creates link with correct URL', () => {
    const workflow: Workflow = {
      id: 'wf-123',
      name: 'My Workflow',
    };

    const element = createWorkflowElement(workflow);
    const link = element.querySelector('a');

    expect(link).not.toBeNull();
    expect(link?.href).toBe('http://localhost:5678/workflow/wf-123');
  });

  it('escapes workflow name in display', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: '<script>alert("xss")</script>',
    };

    const element = createWorkflowElement(workflow);
    const label = element.querySelector('.n8n-tree-label');

    expect(label?.innerHTML).not.toContain('<script>');
    expect(label?.textContent).toContain('script');
  });

  it('sets title attribute with escaped name', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Workflow "with quotes"',
    };

    const element = createWorkflowElement(workflow);
    const link = element.querySelector('a');

    expect(link?.title).toBe('Workflow "with quotes"');
  });

  it('marks current workflow as active', () => {
    mockLocation('/workflow/wf-active');
    const workflow: Workflow = {
      id: 'wf-active',
      name: 'Active Workflow',
    };

    const element = createWorkflowElement(workflow);
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.classList.contains('active')).toBe(true);
  });

  it('does not mark non-current workflow as active', () => {
    mockLocation('/workflow/other-wf');
    const workflow: Workflow = {
      id: 'wf-inactive',
      name: 'Inactive Workflow',
    };

    const element = createWorkflowElement(workflow);
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.classList.contains('active')).toBe(false);
  });

  it('includes workflow icon', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
    };

    const element = createWorkflowElement(workflow);
    const icon = element.querySelector('.n8n-tree-icon.workflow');

    expect(icon).not.toBeNull();
    expect(icon?.innerHTML).toContain('<svg');
  });

  it('includes spacer for alignment', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
    };

    const element = createWorkflowElement(workflow);
    const spacer = element.querySelector('.n8n-tree-spacer');

    expect(spacer).not.toBeNull();
  });

  it('sets draggable attribute on item', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
    };

    const element = createWorkflowElement(workflow);
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.getAttribute('draggable')).toBe('true');
  });

  it('sets data attributes for drag', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      parentFolderId: 'folder-1',
    };

    const element = createWorkflowElement(workflow);
    const item = element.querySelector('.n8n-tree-item') as HTMLElement;

    expect(item?.dataset.itemType).toBe('workflow');
    expect(item?.dataset.itemId).toBe('wf-1');
  });
});

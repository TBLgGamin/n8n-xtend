import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setDragContext, setupDraggable, setupDropTarget } from './dragdrop';

vi.mock('../api', () => ({
  moveFolder: vi.fn().mockResolvedValue(true),
  moveWorkflow: vi.fn().mockResolvedValue(true),
}));

class MockDataTransfer {
  private data: Map<string, string> = new Map();
  dropEffect = 'none';
  effectAllowed = 'uninitialized';

  setData(format: string, data: string): void {
    this.data.set(format, data);
  }

  getData(format: string): string {
    return this.data.get(format) ?? '';
  }

  clearData(): void {
    this.data.clear();
  }
}

function createDragEvent(type: string, dataTransfer?: MockDataTransfer): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: dataTransfer ?? new MockDataTransfer(),
    writable: true,
  });
  return event;
}

describe('setupDraggable', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sets draggable attribute', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-1', 'Workflow Name');

    expect(element.getAttribute('draggable')).toBe('true');
  });

  it('sets item type data attribute', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'folder', 'folder-1', 'Folder Name');

    expect(element.dataset.itemType).toBe('folder');
  });

  it('sets item ID data attribute', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-123', 'Workflow');

    expect(element.dataset.itemId).toBe('wf-123');
  });

  it('does not setup twice for same element', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-1', 'Name');
    setupDraggable(element, 'folder', 'folder-1', 'Different');

    expect(element.dataset.itemType).toBe('workflow');
    expect(element.dataset.itemId).toBe('wf-1');
  });

  it('adds dragging class on dragstart', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-1', 'Workflow');

    const dataTransfer = new MockDataTransfer();
    const event = createDragEvent('dragstart', dataTransfer);
    element.dispatchEvent(event);

    expect(element.classList.contains('n8n-tree-dragging')).toBe(true);
  });

  it('removes dragging class on dragend', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    setupDraggable(element, 'workflow', 'wf-1', 'Workflow');

    element.classList.add('n8n-tree-dragging');
    const event = createDragEvent('dragend');
    element.dispatchEvent(event);

    expect(element.classList.contains('n8n-tree-dragging')).toBe(false);
  });

  it('sets drag data on dragstart', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-1', 'Test Workflow', 'folder-1');

    const dataTransfer = new MockDataTransfer();
    const event = createDragEvent('dragstart', dataTransfer);
    element.dispatchEvent(event);

    const data = JSON.parse(dataTransfer.getData('application/json'));
    expect(data).toEqual({
      type: 'workflow',
      id: 'wf-1',
      name: 'Test Workflow',
      parentFolderId: 'folder-1',
    });
  });

  it('sets effectAllowed to move', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-1', 'Workflow');

    const dataTransfer = new MockDataTransfer();
    const event = createDragEvent('dragstart', dataTransfer);
    element.dispatchEvent(event);

    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('omits parentFolderId when not provided', () => {
    const element = document.createElement('div');
    setupDraggable(element, 'workflow', 'wf-1', 'Workflow');

    const dataTransfer = new MockDataTransfer();
    const event = createDragEvent('dragstart', dataTransfer);
    element.dispatchEvent(event);

    const data = JSON.parse(dataTransfer.getData('application/json'));
    expect(data.parentFolderId).toBeUndefined();
  });
});

describe('setupDropTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds drop target class', () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');

    expect(element.classList.contains('n8n-tree-drop-target')).toBe(true);
  });

  it('sets folder ID data attribute', () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-123');

    expect(element.dataset.folderId).toBe('folder-123');
  });

  it('does not setup twice for same element', () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');
    setupDropTarget(element, 'folder-2');

    expect(element.dataset.folderId).toBe('folder-1');
  });

  it('adds drag-over class on dragover', () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');

    const dataTransfer = new MockDataTransfer();
    const event = createDragEvent('dragover', dataTransfer);
    element.dispatchEvent(event);

    expect(element.classList.contains('n8n-tree-drag-over')).toBe(true);
  });

  it('prevents default on dragover', () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');

    const dataTransfer = new MockDataTransfer();
    const event = createDragEvent('dragover', dataTransfer);
    element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('removes drag-over class on dragleave', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    setupDropTarget(element, 'folder-1');

    element.classList.add('n8n-tree-drag-over');
    const event = new Event('dragleave', { bubbles: true }) as DragEvent;
    Object.defineProperty(event, 'relatedTarget', { value: document.body });
    element.dispatchEvent(event);

    expect(element.classList.contains('n8n-tree-drag-over')).toBe(false);
  });

  it('keeps drag-over class when dragleave to child', () => {
    const element = document.createElement('div');
    const child = document.createElement('span');
    element.appendChild(child);
    setupDropTarget(element, 'folder-1');

    element.classList.add('n8n-tree-drag-over');
    const event = new Event('dragleave', { bubbles: true }) as DragEvent;
    Object.defineProperty(event, 'relatedTarget', { value: child });
    element.dispatchEvent(event);

    expect(element.classList.contains('n8n-tree-drag-over')).toBe(true);
  });

  it('removes drag-over class on drop', async () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');

    element.classList.add('n8n-tree-drag-over');
    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', JSON.stringify({ type: 'workflow', id: 'wf-1' }));

    const event = createDragEvent('drop', dataTransfer);
    element.dispatchEvent(event);

    expect(element.classList.contains('n8n-tree-drag-over')).toBe(false);
  });

  it('prevents default on drop', () => {
    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', JSON.stringify({ type: 'workflow', id: 'wf-1' }));

    const event = createDragEvent('drop', dataTransfer);
    element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

describe('setDragContext', () => {
  it('sets project ID and callback', async () => {
    const callback = vi.fn();
    setDragContext('project-1', callback);

    const element = document.createElement('div');
    setupDropTarget(element, 'folder-1');

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'folder',
        id: 'folder-2',
        name: 'Folder',
        parentFolderId: '0',
      }),
    );

    const event = createDragEvent('drop', dataTransfer);
    element.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(callback).toHaveBeenCalled();
  });
});

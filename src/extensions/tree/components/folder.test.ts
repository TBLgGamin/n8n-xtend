import type { Folder } from '@/shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFolderElement } from './folder';

vi.mock('../api', () => ({
  fetchFolders: vi.fn().mockResolvedValue([]),
}));

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

describe('createFolderElement', () => {
  beforeEach(() => {
    mockLocation('/projects/proj-1/workflows');
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('creates folder element with correct structure', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Test Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');

    expect(element.tagName).toBe('DIV');
    expect(element.className).toBe('n8n-tree-node');
    expect(element.dataset.folderId).toBe('folder-1');
  });

  it('creates link with correct folder URL', () => {
    const folder: Folder = {
      id: 'folder-123',
      name: 'My Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const link = element.querySelector('.n8n-tree-folder-link');

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe(
      'http://localhost:5678/projects/proj-1/folders/folder-123/workflows',
    );
  });

  it('escapes folder name in display', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: '<script>alert("xss")</script>',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const label = element.querySelector('.n8n-tree-label');

    expect(label?.innerHTML).not.toContain('<script>');
    expect(label?.textContent).toContain('script');
  });

  it('shows count when workflowCount is set', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
      workflowCount: 5,
    };

    const element = createFolderElement(folder, 'proj-1');
    const count = element.querySelector('.n8n-tree-count');

    expect(count).not.toBeNull();
    expect(count?.textContent).toBe('5');
  });

  it('shows combined count of workflows and subfolders', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
      workflowCount: 3,
      subFolderCount: 2,
    };

    const element = createFolderElement(folder, 'proj-1');
    const count = element.querySelector('.n8n-tree-count');

    expect(count?.textContent).toBe('5');
  });

  it('does not show count when zero', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Empty Folder',
      resource: 'folder',
      workflowCount: 0,
      subFolderCount: 0,
    };

    const element = createFolderElement(folder, 'proj-1');
    const count = element.querySelector('.n8n-tree-count');

    expect(count).toBeNull();
  });

  it('marks current folder as active', () => {
    mockLocation('/projects/proj-1/folders/folder-active/workflows');
    const folder: Folder = {
      id: 'folder-active',
      name: 'Active Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.classList.contains('active')).toBe(true);
  });

  it('does not mark non-current folder as active', () => {
    mockLocation('/projects/proj-1/folders/other-folder/workflows');
    const folder: Folder = {
      id: 'folder-inactive',
      name: 'Inactive Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.classList.contains('active')).toBe(false);
  });

  it('includes chevron icon', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const chevron = element.querySelector('.n8n-tree-chevron');

    expect(chevron).not.toBeNull();
    expect(chevron?.innerHTML).toContain('<svg');
  });

  it('includes folder icon', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const icon = element.querySelector('.n8n-tree-icon.folder');

    expect(icon).not.toBeNull();
    expect(icon?.innerHTML).toContain('<svg');
  });

  it('starts with collapsed children container', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const children = element.querySelector('.n8n-tree-children');

    expect(children?.classList.contains('collapsed')).toBe(true);
  });

  it('starts with collapsed chevron', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const chevron = element.querySelector('.n8n-tree-chevron');

    expect(chevron?.classList.contains('collapsed')).toBe(true);
  });

  it('sets draggable on item', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.getAttribute('draggable')).toBe('true');
  });

  it('sets up as drop target', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const item = element.querySelector('.n8n-tree-item');

    expect(item?.classList.contains('n8n-tree-drop-target')).toBe(true);
  });

  it('sets folder ID data attribute on drop target', () => {
    const folder: Folder = {
      id: 'folder-drop',
      name: 'Folder',
      resource: 'folder',
    };

    const element = createFolderElement(folder, 'proj-1');
    const item = element.querySelector('.n8n-tree-item') as HTMLElement;

    expect(item?.dataset.folderId).toBe('folder-drop');
  });
});

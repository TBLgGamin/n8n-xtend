import { describe, expect, it } from 'vitest';
import { type Folder, type TreeItem, type Workflow, isFolder } from './api';

describe('isFolder', () => {
  it('returns true for folder items', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Test Folder',
      resource: 'folder',
    };
    expect(isFolder(folder)).toBe(true);
  });

  it('returns true for folder with optional properties', () => {
    const folder: Folder = {
      id: 'folder-1',
      name: 'Test Folder',
      resource: 'folder',
      workflowCount: 5,
      subFolderCount: 2,
      parentFolderId: 'parent-1',
    };
    expect(isFolder(folder)).toBe(true);
  });

  it('returns false for workflow items', () => {
    const workflow: Workflow = {
      id: 'workflow-1',
      name: 'Test Workflow',
    };
    expect(isFolder(workflow)).toBe(false);
  });

  it('returns false for workflow with resource undefined', () => {
    const workflow = {
      id: 'workflow-1',
      name: 'Test Workflow',
      resource: undefined,
    } as unknown as Workflow;
    expect(isFolder(workflow)).toBe(false);
  });

  it('returns false for workflow with different resource', () => {
    const workflow: Workflow = {
      id: 'workflow-1',
      name: 'Test Workflow',
      resource: 'workflow',
    };
    expect(isFolder(workflow as TreeItem)).toBe(false);
  });

  it('correctly types folder after check', () => {
    const item: TreeItem = {
      id: 'folder-1',
      name: 'Test Folder',
      resource: 'folder',
      workflowCount: 3,
    };

    if (isFolder(item)) {
      expect(item.workflowCount).toBe(3);
    }
  });

  it('handles workflow with homeProject', () => {
    const workflow: Workflow = {
      id: 'workflow-1',
      name: 'Test Workflow',
      homeProject: { id: 'project-1' },
    };
    expect(isFolder(workflow)).toBe(false);
  });

  it('handles workflow with versionId', () => {
    const workflow: Workflow = {
      id: 'workflow-1',
      name: 'Test Workflow',
      versionId: 'v1',
      parentFolderId: 'folder-1',
    };
    expect(isFolder(workflow)).toBe(false);
  });
});

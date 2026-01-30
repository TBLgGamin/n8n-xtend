export interface Folder {
  id: string;
  name: string;
  resource: 'folder';
  workflowCount?: number;
  subFolderCount?: number;
  parentFolderId?: string;
}

export interface FolderResponse {
  data: Folder;
}

export interface Workflow {
  id: string;
  name: string;
  resource?: string;
  homeProject?: {
    id: string;
  };
}

export interface WorkflowResponse {
  data: Workflow;
}

export interface FoldersResponse {
  data: (Folder | Workflow)[];
}

export interface ApiResponse<T> {
  data: T;
}

export interface FolderFilter {
  isArchived: boolean;
  parentFolderId: string;
  projectId: string;
}

export type TreeItem = Folder | Workflow;

export function isFolder(item: TreeItem): item is Folder {
  return item.resource === 'folder';
}

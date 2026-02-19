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
  versionId?: string;
  parentFolderId?: string;
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

export type TreeItemType = 'folder' | 'workflow';

export function isFolder(item: TreeItem): item is Folder {
  return item.resource === 'folder';
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
  pinData: Record<string, unknown>;
  tags: { id: string; name: string }[];
  versionId?: string;
  parentFolderId?: string;
  homeProject?: {
    id: string;
  };
}

export interface WorkflowDetailResponse {
  data: WorkflowDetail;
}

export interface WorkflowListResponse {
  data: Workflow[];
  nextCursor?: string;
}

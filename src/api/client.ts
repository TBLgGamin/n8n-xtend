import { logger } from '../utils/logger';
import { getBrowserId } from '../utils/storage';
import type { FoldersResponse, FolderResponse, WorkflowResponse, FolderFilter, TreeItem } from '../types';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(location.origin + endpoint, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'browser-id': getBrowserId(),
    },
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export async function fetchFolders(
  projectId: string,
  parentFolderId = '0'
): Promise<TreeItem[]> {
  const filter: FolderFilter = {
    isArchived: false,
    parentFolderId,
    projectId,
  };

  const filterParam = encodeURIComponent(JSON.stringify(filter));
  const endpoint = `/rest/workflows?includeScopes=true&includeFolders=true&filter=${filterParam}&sortBy=name:asc`;

  const data = await request<FoldersResponse>(endpoint);
  return data.data ?? [];
}

export async function fetchFolder(folderId: string): Promise<FolderResponse['data'] | null> {
  try {
    const data = await request<FolderResponse>(`/rest/folders/${folderId}`);
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchFolderPath(folderId: string): Promise<string[]> {
  const path: string[] = [];
  let currentId: string | undefined = folderId;

  while (currentId && currentId !== '0') {
    path.unshift(currentId);
    const folder = await fetchFolder(currentId);
    currentId = folder?.parentFolderId;
  }

  return path;
}

const workflowProjectCache = new Map<string, string>();

export async function fetchWorkflowProjectId(
  workflowId: string
): Promise<string | null> {
  const cached = workflowProjectCache.get(workflowId);
  if (cached) {
    return cached;
  }

  try {
    const data = await request<WorkflowResponse>(`/rest/workflows/${workflowId}`);
    const projectId = data.data?.homeProject?.id;
    if (projectId) {
      workflowProjectCache.set(workflowId, projectId);
    }
    return projectId ?? null;
  } catch (error) {
    logger.error('Failed to fetch workflow project', error);
    return null;
  }
}

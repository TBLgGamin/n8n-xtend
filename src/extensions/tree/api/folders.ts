import { request } from '@/shared/api';
import type { FolderFilter, FolderResponse, FoldersResponse, TreeItem } from '@/shared/types';

export async function fetchFolders(projectId: string, parentFolderId = '0'): Promise<TreeItem[]> {
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

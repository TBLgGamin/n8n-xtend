import { patch, request } from '@/shared/api';
import type { FolderFilter, FolderResponse, FoldersResponse, TreeItem } from '@/shared/types';
import { logger } from '@/shared/utils';

const log = logger.child('api');

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

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: FolderResponse['data'] | null;
  timestamp: number;
}

const folderCache = new Map<string, CacheEntry>();

function isCacheEntryFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

export async function fetchFolderPath(folderId: string): Promise<string[]> {
  const path: string[] = [];
  let currentId: string | undefined = folderId;

  while (currentId && currentId !== '0') {
    path.unshift(currentId);

    const cacheEntry = folderCache.get(currentId);
    let folder: FolderResponse['data'] | null;

    if (cacheEntry && isCacheEntryFresh(cacheEntry)) {
      folder = cacheEntry.data;
    } else {
      folder = await fetchFolder(currentId);
      folderCache.set(currentId, { data: folder, timestamp: Date.now() });
    }

    currentId = folder?.parentFolderId;
  }

  return path;
}

export function clearFolderCache(): void {
  folderCache.clear();
}

export async function moveFolder(
  projectId: string,
  folderId: string,
  parentFolderId: string,
): Promise<boolean> {
  try {
    await patch(`/rest/projects/${projectId}/folders/${folderId}`, { parentFolderId });
    clearFolderCache();
    return true;
  } catch (error) {
    log.debug('Failed to move folder', error);
    return false;
  }
}

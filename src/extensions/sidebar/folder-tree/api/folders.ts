import { del, patch, post, request } from '@/shared/api';
import type { FolderFilter, FolderResponse, FoldersResponse, TreeItem } from '@/shared/types';
import { isFolder } from '@/shared/types/api';
import { logger } from '@/shared/utils';
import { copyWorkflow } from './workflows';

const log = logger.child('api');

export async function fetchFolders(projectId: string, parentFolderId = '0'): Promise<TreeItem[]> {
  const cacheKey = `${projectId}:${parentFolderId}`;
  const cached = contentCache.get(cacheKey);

  if (cached && isContentCacheFresh(cached)) {
    return cached.items;
  }

  const filter: FolderFilter = {
    isArchived: false,
    parentFolderId,
    projectId,
  };

  const filterParam = encodeURIComponent(JSON.stringify(filter));
  const endpoint = `/rest/workflows?includeScopes=true&includeFolders=true&filter=${filterParam}&sortBy=name:asc`;

  const data = await request<FoldersResponse>(endpoint);
  const items = data.data ?? [];

  for (const item of items) {
    if (!item.parentFolderId) {
      item.parentFolderId = parentFolderId;
    }
  }

  contentCache.set(cacheKey, { items, timestamp: Date.now() });
  return items;
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
const CONTENT_CACHE_TTL_MS = 30 * 1000;

interface CacheEntry {
  data: FolderResponse['data'] | null;
  timestamp: number;
}

interface ContentCacheEntry {
  items: TreeItem[];
  timestamp: number;
}

const folderCache = new Map<string, CacheEntry>();
const contentCache = new Map<string, ContentCacheEntry>();

function isCacheEntryFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

function isContentCacheFresh(entry: ContentCacheEntry): boolean {
  return Date.now() - entry.timestamp < CONTENT_CACHE_TTL_MS;
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
  contentCache.clear();
}

export function clearContentCacheEntry(projectId: string, parentFolderId: string): void {
  const cacheKey = `${projectId}:${parentFolderId}`;
  contentCache.delete(cacheKey);
}

export async function fetchFoldersFresh(
  projectId: string,
  parentFolderId = '0',
): Promise<TreeItem[]> {
  clearContentCacheEntry(projectId, parentFolderId);
  return fetchFolders(projectId, parentFolderId);
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
    log.debug('Failed to move folder', { folderId, parentFolderId, error });
    return false;
  }
}

async function createFolder(
  projectId: string,
  name: string,
  parentFolderId: string,
): Promise<string | null> {
  const body: Record<string, unknown> = { name };
  if (parentFolderId !== '0') {
    body.parentFolderId = parentFolderId;
  }

  const response = await post<FolderResponse>(`/rest/projects/${projectId}/folders`, body);
  return response.data?.id ?? null;
}

async function copyFolderContents(
  projectId: string,
  sourceFolderId: string,
  targetFolderId: string,
): Promise<void> {
  const items = await fetchFolders(projectId, sourceFolderId);

  await Promise.all(
    items.map((item) =>
      isFolder(item)
        ? copyFolder(projectId, item.id, item.name, targetFolderId)
        : copyWorkflow(item.id, targetFolderId, projectId),
    ),
  );
}

export async function copyFolder(
  projectId: string,
  sourceFolderId: string,
  folderName: string,
  targetFolderId: string,
): Promise<boolean> {
  try {
    const newFolderId = await createFolder(projectId, folderName, targetFolderId);
    if (!newFolderId) return false;

    await copyFolderContents(projectId, sourceFolderId, newFolderId);
    clearFolderCache();
    return true;
  } catch (error) {
    log.debug('Failed to copy folder', { sourceFolderId, targetFolderId, error });
    return false;
  }
}

export async function renameFolder(
  projectId: string,
  folderId: string,
  name: string,
): Promise<boolean> {
  try {
    await patch(`/rest/projects/${projectId}/folders/${folderId}`, { name });
    clearFolderCache();
    return true;
  } catch (error) {
    log.debug('Failed to rename folder', { folderId, name, error });
    return false;
  }
}

export async function deleteFolder(projectId: string, folderId: string): Promise<boolean> {
  try {
    await del(`/rest/projects/${projectId}/folders/${folderId}`);
    clearFolderCache();
    return true;
  } catch (error) {
    log.debug('Failed to delete folder', { folderId, error });
    return false;
  }
}

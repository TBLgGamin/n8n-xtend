import {
  fetchAllWorkflowDetails,
  fetchProjectWorkflows,
  fetchWorkflowDetailsBatch,
} from '@/shared/api';
import type { Workflow, WorkflowDetail } from '@/shared/types';
import { logger } from '@/shared/utils';
import { getGraphState, isCacheValid, setGraphState, updateGraphStatus } from './state';

const log = logger.child('graph:data');

export interface LoadResult {
  workflows: Map<string, WorkflowDetail>;
  fromCache: boolean;
}

export interface LoadCallbacks {
  onProgress?: (loaded: number, total: number) => void;
}

interface CacheDiff {
  newIds: string[];
  staleIds: string[];
  removedIds: string[];
}

function diffAgainstCache(list: Workflow[], cached: Map<string, WorkflowDetail>): CacheDiff {
  const listIds = new Set(list.map((w) => w.id));
  const newIds: string[] = [];
  const staleIds: string[] = [];

  for (const wf of list) {
    const existing = cached.get(wf.id);
    if (!existing) {
      newIds.push(wf.id);
    } else if (wf.versionId && existing.versionId && wf.versionId !== existing.versionId) {
      staleIds.push(wf.id);
    }
  }

  const removedIds = [...cached.keys()].filter((id) => !listIds.has(id));
  return { newIds, staleIds, removedIds };
}

async function applyIncrementalUpdate(
  projectId: string,
  cached: Map<string, WorkflowDetail>,
  diff: CacheDiff,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Map<string, WorkflowDetail>> {
  const updated = new Map(cached);

  for (const id of diff.removedIds) {
    updated.delete(id);
  }

  const idsToFetch = [...diff.newIds, ...diff.staleIds];
  if (idsToFetch.length > 0) {
    const fetched = await fetchWorkflowDetailsBatch(idsToFetch, onProgress);
    for (const [id, detail] of fetched) {
      updated.set(id, detail);
    }
  }

  setGraphState(projectId, updated, 'loaded');
  return updated;
}

async function fullLoad(
  projectId: string,
  list: Workflow[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<Map<string, WorkflowDetail>> {
  setGraphState(projectId, new Map(), 'loading');
  const options: Parameters<typeof fetchAllWorkflowDetails>[1] = { prefetchedList: list };
  if (onProgress) options.onProgress = onProgress;
  const workflows = await fetchAllWorkflowDetails(projectId, options);
  setGraphState(projectId, workflows, 'loaded');
  return workflows;
}

export async function loadProjectWorkflowsSmart(
  projectId: string,
  callbacks: LoadCallbacks,
): Promise<LoadResult | null> {
  log.debug('Starting smart load', { projectId });

  const hasCachedData = isCacheValid(projectId);
  log.debug('Cache validity check', { hasCachedData });
  const cached = hasCachedData ? getGraphState() : null;
  if (cached) {
    log.debug('Using cached state', { size: cached.workflows.size });
  }

  try {
    log.debug('Fetching workflow list', { projectId });
    const list = await fetchProjectWorkflows(projectId);
    log.debug(`Fetched ${list.length} workflows from list`, { projectId });

    if (cached) {
      const diff = diffAgainstCache(list, cached.workflows);

      if (diff.newIds.length === 0 && diff.staleIds.length === 0 && diff.removedIds.length === 0) {
        log.debug('Cache fully up to date');
        return { workflows: cached.workflows, fromCache: true };
      }

      log.debug('Incremental update needed', {
        newCount: diff.newIds.length,
        staleCount: diff.staleIds.length,
        removedCount: diff.removedIds.length,
      });

      setGraphState(projectId, cached.workflows, 'loading');
      const updated = await applyIncrementalUpdate(
        projectId,
        cached.workflows,
        diff,
        callbacks.onProgress,
      );
      log.debug(`Incremental update complete: ${updated.size} workflows`);
      return { workflows: updated, fromCache: false };
    }

    log.debug('No cache, full load', { projectId, count: list.length });
    const workflows = await fullLoad(projectId, list, callbacks.onProgress);
    log.debug(`Full load complete: ${workflows.size} workflows`);
    return { workflows, fromCache: false };
  } catch (error) {
    log.warn('Failed to load workflows', { projectId, error });
    updateGraphStatus('error');
    return null;
  }
}

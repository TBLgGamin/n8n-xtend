import type {
  WorkflowDetail,
  WorkflowDetailResponse,
  WorkflowListResponse,
  WorkflowResponse,
} from '@/shared/types';
import { isValidId, logger } from '@/shared/utils';
import { request } from './client';

const log = logger.child('api:workflows');

const BATCH_CONCURRENCY = 5;
const PAGE_LIMIT = 250;

const workflowProjectCache = new Map<string, string | null>();

export async function fetchWorkflowProjectId(workflowId: string): Promise<string | null> {
  if (workflowProjectCache.has(workflowId)) {
    return workflowProjectCache.get(workflowId) ?? null;
  }

  try {
    const data = await request<WorkflowResponse>(`/rest/workflows/${workflowId}`);
    const projectId =
      data.data?.homeProject?.id ??
      data.data?.shared?.find((s) => s.role === 'workflow:owner')?.projectId ??
      null;
    workflowProjectCache.set(workflowId, projectId);
    return projectId;
  } catch (error) {
    log.debug('Failed to fetch workflow project', { workflowId, error });
    return null;
  }
}

export async function fetchProjectWorkflows(
  projectId: string,
): Promise<WorkflowListResponse['data']> {
  if (!isValidId(projectId)) {
    log.warn('Invalid project ID', { projectId });
    return [];
  }

  const allWorkflows: WorkflowListResponse['data'] = [];
  let cursor: string | undefined;

  do {
    const filter = encodeURIComponent(JSON.stringify({ projectId, isArchived: false }));
    let endpoint = `/rest/workflows?filter=${filter}&limit=${PAGE_LIMIT}`;
    if (cursor) {
      endpoint += `&cursor=${encodeURIComponent(cursor)}`;
    }

    try {
      const response = await request<WorkflowListResponse>(endpoint);
      allWorkflows.push(...response.data);
      cursor = response.nextCursor;
    } catch (error) {
      log.warn('Failed to fetch project workflows', { projectId, error });
      break;
    }
  } while (cursor);

  log.debug(`Fetched ${allWorkflows.length} workflows for project`, { projectId });
  return allWorkflows;
}

export async function fetchWorkflowDetail(workflowId: string): Promise<WorkflowDetail | null> {
  if (!isValidId(workflowId)) {
    log.warn('Invalid workflow ID', { workflowId });
    return null;
  }

  try {
    const response = await request<WorkflowDetailResponse>(`/rest/workflows/${workflowId}`);
    return response.data;
  } catch (error) {
    log.debug('Failed to fetch workflow detail', { workflowId, error });
    return null;
  }
}

export interface FetchAllWorkflowDetailsOptions {
  onProgress?: (loaded: number, total: number) => void;
}

export async function fetchAllWorkflowDetails(
  projectId: string,
  options?: FetchAllWorkflowDetailsOptions,
): Promise<Map<string, WorkflowDetail>> {
  const workflows = await fetchProjectWorkflows(projectId);
  const results = new Map<string, WorkflowDetail>();
  const total = workflows.length;
  let loaded = 0;

  log.debug(`Fetching details for ${total} workflows`, { projectId });
  options?.onProgress?.(0, total);

  for (let i = 0; i < workflows.length; i += BATCH_CONCURRENCY) {
    const batch = workflows.slice(i, i + BATCH_CONCURRENCY);
    const details = await Promise.all(batch.map((w) => fetchWorkflowDetail(w.id)));

    for (const detail of details) {
      if (detail) {
        results.set(detail.id, detail);
      }
      loaded++;
      options?.onProgress?.(loaded, total);
    }
  }

  log.debug(`Loaded ${results.size}/${total} workflow details`, { projectId });
  return results;
}

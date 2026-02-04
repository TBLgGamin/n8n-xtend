import { patch, request } from '@/shared/api';
import type { WorkflowResponse } from '@/shared/types';
import { logger } from '@/shared/utils';

const log = logger.child('api');

const workflowProjectCache = new Map<string, string>();

export async function fetchWorkflowProjectId(workflowId: string): Promise<string | null> {
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
    log.error('Failed to fetch workflow project', error);
    return null;
  }
}

export async function fetchWorkflowVersionId(workflowId: string): Promise<string | null> {
  try {
    const data = await request<{ data: { versionId: string } }>(`/rest/workflows/${workflowId}`);
    return data.data?.versionId ?? null;
  } catch (error) {
    log.error('Failed to fetch workflow version', error);
    return null;
  }
}

export async function moveWorkflow(workflowId: string, parentFolderId: string): Promise<boolean> {
  try {
    const versionId = await fetchWorkflowVersionId(workflowId);
    if (!versionId) {
      log.error('Failed to get workflow versionId', { workflowId });
      return false;
    }
    const targetFolderId = parentFolderId === '0' ? null : parentFolderId;
    await patch(`/rest/workflows/${workflowId}`, { parentFolderId: targetFolderId, versionId });
    return true;
  } catch (error) {
    log.error('Failed to move workflow', error);
    return false;
  }
}

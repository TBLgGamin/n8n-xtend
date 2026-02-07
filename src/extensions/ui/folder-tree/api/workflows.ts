import { patch, post, request } from '@/shared/api';
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
    log.debug('Failed to fetch workflow project', error);
    return null;
  }
}

export async function fetchWorkflowVersionId(workflowId: string): Promise<string | null> {
  try {
    const data = await request<{ data: { versionId: string } }>(`/rest/workflows/${workflowId}`);
    return data.data?.versionId ?? null;
  } catch (error) {
    log.debug('Failed to fetch workflow version', error);
    return null;
  }
}

export async function moveWorkflow(workflowId: string, parentFolderId: string): Promise<boolean> {
  try {
    const versionId = await fetchWorkflowVersionId(workflowId);
    if (!versionId) {
      log.debug('Failed to get workflow versionId', { workflowId });
      return false;
    }
    const targetFolderId = parentFolderId === '0' ? null : parentFolderId;
    await patch(`/rest/workflows/${workflowId}`, { parentFolderId: targetFolderId, versionId });
    return true;
  } catch (error) {
    log.debug('Failed to move workflow', error);
    return false;
  }
}

interface WorkflowDetailResponse {
  data: {
    name: string;
    nodes: unknown[];
    connections: Record<string, unknown>;
    settings: Record<string, unknown>;
    pinData: Record<string, unknown>;
    tags: unknown[];
  };
}

export async function copyWorkflow(
  workflowId: string,
  targetFolderId: string,
  projectId: string,
): Promise<boolean> {
  try {
    const response = await request<WorkflowDetailResponse>(`/rest/workflows/${workflowId}`);
    const workflow = response.data;

    const parentFolder = targetFolderId === '0' ? null : targetFolderId;

    await post('/rest/workflows', {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      pinData: workflow.pinData ?? {},
      tags: workflow.tags ?? [],
      active: false,
      parentFolderId: parentFolder,
      projectId,
    });

    return true;
  } catch (error) {
    log.debug('Failed to copy workflow', error);
    return false;
  }
}

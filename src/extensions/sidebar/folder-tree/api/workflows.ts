import { patch, post, request } from '@/shared/api';
export { fetchWorkflowProjectId } from '@/shared/api';
import type { WorkflowDetailResponse } from '@/shared/types';
import { logger } from '@/shared/utils';

const log = logger.child('api');

export async function fetchWorkflowVersionId(workflowId: string): Promise<string | null> {
  try {
    const data = await request<{ data: { versionId: string } }>(`/rest/workflows/${workflowId}`);
    return data.data?.versionId ?? null;
  } catch (error) {
    log.debug('Failed to fetch workflow version', { workflowId, error });
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
    await patch(`/rest/workflows/${workflowId}`, { versionId, parentFolderId });
    return true;
  } catch (error) {
    log.debug('Failed to move workflow', { workflowId, error });
    return false;
  }
}

export async function copyWorkflow(
  workflowId: string,
  targetFolderId: string,
  projectId: string,
): Promise<boolean> {
  try {
    const response = await request<WorkflowDetailResponse>(`/rest/workflows/${workflowId}`);
    const workflow = response.data;

    const body: Record<string, unknown> = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      pinData: workflow.pinData ?? {},
      tags: workflow.tags ?? [],
      active: false,
      projectId,
    };
    if (targetFolderId !== '0') {
      body.parentFolderId = targetFolderId;
    }

    await post('/rest/workflows', body);
    return true;
  } catch (error) {
    log.debug('Failed to copy workflow', { workflowId, error });
    return false;
  }
}

import { request } from '@/shared/api';
import type { WorkflowResponse } from '@/shared/types';
import { logger } from '@/shared/utils';

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
    logger.error('Failed to fetch workflow project', error);
    return null;
  }
}

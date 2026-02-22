import { patch, request } from '@/shared/api';
import { logger } from '@/shared/utils';
import type { ConnectionMap, LintableNode } from '../engine/types';

const log = logger.child('lint:api');

interface WorkflowResponse {
  data: {
    nodes: LintableNode[];
    connections: ConnectionMap;
    versionId: string;
  };
}

export async function fetchWorkflowForLint(
  workflowId: string,
): Promise<{ nodes: LintableNode[]; connections: ConnectionMap; versionId: string } | null> {
  try {
    const response = await request<WorkflowResponse>(`/rest/workflows/${workflowId}`);
    return {
      nodes: response.data.nodes,
      connections: response.data.connections,
      versionId: response.data.versionId,
    };
  } catch (error) {
    log.debug('Failed to fetch workflow for linting', { workflowId, error });
    return null;
  }
}

export async function saveLintedWorkflow(
  workflowId: string,
  versionId: string,
  nodes: LintableNode[],
  connections: ConnectionMap,
): Promise<boolean> {
  try {
    await patch(`/rest/workflows/${workflowId}`, {
      versionId,
      nodes: nodes as unknown as Record<string, unknown>[],
      connections: connections as unknown as Record<string, unknown>,
    });
    return true;
  } catch (error) {
    log.debug('Failed to save linted workflow', { workflowId, error });
    return false;
  }
}

export async function fetchWorkflowVersionId(workflowId: string): Promise<string | null> {
  try {
    const response = await request<{ data: { versionId: string } }>(
      `/rest/workflows/${workflowId}`,
    );
    return response.data?.versionId ?? null;
  } catch (error) {
    log.debug('Failed to fetch workflow version', { workflowId, error });
    return null;
  }
}

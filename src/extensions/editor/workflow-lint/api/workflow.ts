import { patch, request } from '@/shared/api';
import { isValidId, logger } from '@/shared/utils';
import type { ConnectionMap, LintableNode } from '../engine/types';

const log = logger.child('lint:api');

let cachedNodeTypeNames: Map<string, string> | null = null;

interface NodeTypeDescriptor {
  name: string;
  defaults?: { name?: string };
}

export async function fetchNodeTypeNames(): Promise<Map<string, string>> {
  if (cachedNodeTypeNames) return cachedNodeTypeNames;

  try {
    const descriptors = await request<NodeTypeDescriptor[]>('/types/nodes.json');
    const map = new Map<string, string>();
    for (const desc of descriptors) {
      if (desc.name && desc.defaults?.name) {
        map.set(desc.name, desc.defaults.name);
      }
    }
    cachedNodeTypeNames = map;
    log.debug('Fetched node type names', { count: map.size });
    return map;
  } catch (error) {
    log.debug('Failed to fetch node type names, using fallback', { error });
    return new Map();
  }
}

export function getCachedNodeTypeNames(): Map<string, string> {
  return cachedNodeTypeNames ?? new Map();
}

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
  if (!isValidId(workflowId)) return null;
  try {
    const response = await request<WorkflowResponse>(`/rest/workflows/${workflowId}`);
    return {
      nodes: response.data.nodes,
      connections: response.data.connections,
      versionId: response.data.versionId,
    };
  } catch (error) {
    log.warn('Failed to fetch workflow for linting', { workflowId, error });
    return null;
  }
}

export async function saveLintedWorkflow(
  workflowId: string,
  versionId: string,
  nodes: LintableNode[],
  connections: ConnectionMap,
): Promise<boolean> {
  if (!isValidId(workflowId)) return false;
  try {
    await patch(`/rest/workflows/${workflowId}`, {
      versionId,
      nodes: nodes as unknown as Record<string, unknown>[],
      connections: connections as unknown as Record<string, unknown>,
    });
    return true;
  } catch (error) {
    log.warn('Failed to save linted workflow', { workflowId, error });
    return false;
  }
}

export async function fetchWorkflowVersionId(workflowId: string): Promise<string | null> {
  if (!isValidId(workflowId)) return null;
  try {
    const response = await request<{ data: { versionId: string } }>(
      `/rest/workflows/${workflowId}`,
    );
    return response.data?.versionId ?? null;
  } catch (error) {
    log.warn('Failed to fetch workflow version', { workflowId, error });
    return null;
  }
}

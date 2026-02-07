import { fetchAllWorkflowDetails } from '@/shared/api';
import type { WorkflowDetail } from '@/shared/types';
import { logger } from '@/shared/utils';
import { clearGraphState, isCacheValid, setGraphState, updateGraphStatus } from './state';

const log = logger.child('graph:data');

export interface LoadResult {
  workflows: Map<string, WorkflowDetail>;
  fromCache: boolean;
}

export async function loadProjectWorkflows(
  projectId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LoadResult | null> {
  if (isCacheValid(projectId)) {
    const { getGraphState } = await import('./state');
    const cached = getGraphState();
    if (cached) {
      log.debug('Using cached workflow data', { projectId });
      return { workflows: cached.workflows, fromCache: true };
    }
  }

  clearGraphState();
  setGraphState(projectId, new Map(), 'loading');

  try {
    const workflows = await fetchAllWorkflowDetails(projectId, { onProgress });
    setGraphState(projectId, workflows, 'loaded');
    log.debug(`Loaded ${workflows.size} workflows`, { projectId });
    return { workflows, fromCache: false };
  } catch (error) {
    log.warn('Failed to load project workflows', { projectId, error });
    updateGraphStatus('error');
    return null;
  }
}

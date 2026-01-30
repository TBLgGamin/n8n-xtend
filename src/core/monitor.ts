import { fetchWorkflowProjectId } from '../api/client';
import { logger } from '../utils/logger';
import { getProjectIdFromUrl, getWorkflowIdFromUrl, isAuthPage } from '../utils/url';
import { removeTree, tryInject } from './injector';

const POLL_INTERVAL = 500;

interface MonitorState {
  currentProjectId: string | null;
  currentPath: string | null;
}

const state: MonitorState = {
  currentProjectId: null,
  currentPath: null,
};

async function checkAndInject(): Promise<void> {
  if (isAuthPage()) {
    state.currentProjectId = null;
    state.currentPath = null;
    return;
  }

  const sidebar = document.querySelector('#sidebar');
  if (!sidebar) return;

  let projectId = getProjectIdFromUrl();
  const workflowId = getWorkflowIdFromUrl();

  if (!projectId && workflowId) {
    projectId = await fetchWorkflowProjectId(workflowId);
  }

  if (!projectId) {
    removeTree();
    state.currentProjectId = null;
    state.currentPath = null;
    return;
  }

  const contextChanged =
    projectId !== state.currentProjectId ||
    location.pathname !== state.currentPath;

  if (contextChanged) {
    logger.info('Context changed', {
      from: state.currentProjectId,
      to: projectId,
    });

    removeTree();
    state.currentProjectId = projectId;
    state.currentPath = location.pathname;

    tryInject(projectId);
  }
}

export function startMonitor(): void {
  logger.info('Monitor started');
  setInterval(checkAndInject, POLL_INTERVAL);
}

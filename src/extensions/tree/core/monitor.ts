import {
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
} from '@/shared/utils';

const log = logger.child('monitor');
import { fetchWorkflowProjectId } from '../api';
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

  const normalizedPath = getNormalizedContextPath();
  const contextChanged =
    projectId !== state.currentProjectId || normalizedPath !== state.currentPath;

  if (contextChanged) {
    log.info('Context changed', {
      from: state.currentProjectId,
      to: projectId,
    });

    removeTree();
    state.currentProjectId = projectId;
    state.currentPath = normalizedPath;

    tryInject(projectId);
  }
}

export function startMonitor(): void {
  log.info('Monitor started');
  setInterval(checkAndInject, POLL_INTERVAL);
}

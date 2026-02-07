import { fetchWorkflowProjectId } from '@/shared/api';
import {
  type PollMonitor,
  createPollMonitor,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
} from '@/shared/utils';
import {
  checkNavigationChange,
  injectGraphMenuItem,
  removeGraphMenuItem,
  setProjectId,
} from './injector';
import { clearGraphState } from './state';

const log = logger.child('graph:monitor');

const POLL_INTERVAL = 500;

let currentProjectId: string | null = null;

async function checkAndInject(): Promise<void> {
  if (isAuthPage()) {
    removeGraphMenuItem();
    currentProjectId = null;
    return;
  }

  const sidebar = document.querySelector('#sidebar');
  if (!sidebar) {
    removeGraphMenuItem();
    currentProjectId = null;
    return;
  }

  let projectId = getProjectIdFromUrl();
  const workflowId = getWorkflowIdFromUrl();

  if (!projectId && workflowId) {
    projectId = await fetchWorkflowProjectId(workflowId);
  }

  if (!projectId) {
    removeGraphMenuItem();
    currentProjectId = null;
    return;
  }

  if (projectId !== currentProjectId) {
    log.debug('Project changed', { from: currentProjectId, to: projectId });
    clearGraphState();
    currentProjectId = projectId;
  }

  setProjectId(projectId);
  injectGraphMenuItem();
  checkNavigationChange();
}

const monitor: PollMonitor = createPollMonitor({
  interval: POLL_INTERVAL,
  check: checkAndInject,
  onStart: () => log.debug('Graph monitor started'),
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

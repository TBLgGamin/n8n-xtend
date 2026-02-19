import { fetchWorkflowProjectId } from '@/shared/api';
import {
  type PollMonitor,
  createPollMonitor,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
  on,
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

export function startMonitor(): void {
  monitor.start();

  on('folder-tree:item-moved', () => {
    log.debug('Item moved in folder tree, graph data may be stale');
    clearGraphState();
  });

  on('folder-tree:items-moved', () => {
    log.debug('Batch move in folder tree, graph data may be stale');
    clearGraphState();
  });

  on('folder-tree:tree-refreshed', () => {
    log.debug('Tree refreshed externally, graph data may be stale');
    clearGraphState();
  });
}

export function stopMonitor(): void {
  monitor.stop();
  clearGraphState();
}

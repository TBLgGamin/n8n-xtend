import {
  type AdaptivePollMonitor,
  createAdaptivePollMonitor,
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
} from '@/shared/utils';

const log = logger.child('folder-tree:monitor');
import { fetchWorkflowProjectId } from '../api';
import { removeFolderTree, tryInject } from './injector';

const ACTIVE_POLL_INTERVAL = 100;
const IDLE_POLL_INTERVAL = 250;
const IDLE_TIMEOUT = 3000;
const ACTIVITY_THROTTLE = 50;

let currentProjectId: string | null = null;
let currentPath: string | null = null;

async function checkAndInject(): Promise<void> {
  if (isAuthPage()) {
    currentProjectId = null;
    currentPath = null;
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
    removeFolderTree();
    currentProjectId = null;
    currentPath = null;
    return;
  }

  const normalizedPath = getNormalizedContextPath();
  const contextChanged = projectId !== currentProjectId || normalizedPath !== currentPath;

  if (contextChanged) {
    log.debug('Context changed', {
      from: currentProjectId,
      to: projectId,
    });

    removeFolderTree();
    currentProjectId = projectId;
    currentPath = normalizedPath;

    tryInject(projectId);
  }
}

const monitor: AdaptivePollMonitor = createAdaptivePollMonitor({
  activeInterval: ACTIVE_POLL_INTERVAL,
  idleInterval: IDLE_POLL_INTERVAL,
  idleTimeout: IDLE_TIMEOUT,
  activityThrottle: ACTIVITY_THROTTLE,
  check: checkAndInject,
  onStart: () => log.debug('Monitor started'),
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

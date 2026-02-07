import {
  type AdaptivePollMonitor,
  type PollMonitor,
  createAdaptivePollMonitor,
  createPollMonitor,
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
} from '@/shared/utils';

const log = logger.child('folder-tree:monitor');
import { fetchWorkflowProjectId } from '../api';
import { removeFolderTree, tryInject } from './injector';
import { clearTreeState, getTreeState, syncFolderContents } from './tree';

const ACTIVE_POLL_INTERVAL = 100;
const IDLE_POLL_INTERVAL = 250;
const IDLE_TIMEOUT = 3000;
const ACTIVITY_THROTTLE = 50;
const SYNC_POLL_INTERVAL = 5000;

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
    clearTreeState();
    currentProjectId = projectId;
    currentPath = normalizedPath;

    tryInject(projectId);
  }
}

async function syncExpandedFolders(): Promise<void> {
  const state = getTreeState();
  if (!state) return;

  const foldersToSync = Array.from(state.currentItems.keys());

  for (const folderId of foldersToSync) {
    await syncFolderContents(state.projectId, folderId);
  }
}

const monitor: AdaptivePollMonitor = createAdaptivePollMonitor({
  activeInterval: ACTIVE_POLL_INTERVAL,
  idleInterval: IDLE_POLL_INTERVAL,
  idleTimeout: IDLE_TIMEOUT,
  activityThrottle: ACTIVITY_THROTTLE,
  check: checkAndInject,
  onStart: () => log.debug('Context monitor started'),
});

const syncMonitor: PollMonitor = createPollMonitor({
  interval: SYNC_POLL_INTERVAL,
  check: syncExpandedFolders,
  onStart: () => log.debug('Sync monitor started'),
});

export function startMonitor(): void {
  monitor.start();
  syncMonitor.start();
}

export function stopMonitor(): void {
  monitor.stop();
  syncMonitor.stop();
  clearTreeState();
}

import {
  type AdaptivePollMonitor,
  type PollMonitor,
  createAdaptivePollMonitor,
  createPollMonitor,
  emit,
  getFolderIdFromUrl,
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
} from '@/shared/utils';

const log = logger.child('folder-tree:monitor');
import { fetchWorkflowProjectId } from '../api';
import { clearSelection } from './dragdrop';
import { removeFolderTree, tryInject } from './injector';
import { clearTreeState, getTreeState, syncFolderContents } from './tree';

const ACTIVE_POLL_INTERVAL = 100;
const IDLE_POLL_INTERVAL = 250;
const IDLE_TIMEOUT = 3000;
const ACTIVITY_THROTTLE = 50;
const SYNC_POLL_INTERVAL = 5000;

let currentProjectId: string | null = null;
let currentPath: string | null = null;
let isChecking = false;

async function checkAndInject(): Promise<void> {
  if (isChecking) return;
  isChecking = true;

  try {
    await checkAndInjectCore();
  } finally {
    isChecking = false;
  }
}

async function checkAndInjectCore(): Promise<void> {
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
    clearSelection();
    currentProjectId = projectId;
    currentPath = normalizedPath;

    tryInject(projectId);

    const folderId = getFolderIdFromUrl();
    const navPayload: { projectId: string; folderId?: string; workflowId?: string } = {
      projectId,
    };
    if (folderId) navPayload.folderId = folderId;
    if (workflowId) navPayload.workflowId = workflowId;
    emit('folder-tree:navigated', navPayload);
  }
}

let isSyncing = false;

async function syncExpandedFolders(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const state = getTreeState();
    if (!state) return;

    const foldersToSync = Array.from(state.currentItems.keys());
    if (foldersToSync.length === 0) return;

    log.debug(`Syncing ${foldersToSync.length} expanded folders`);
    await Promise.all(
      foldersToSync.map((folderId) => syncFolderContents(state.projectId, folderId)),
    );
  } finally {
    isSyncing = false;
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

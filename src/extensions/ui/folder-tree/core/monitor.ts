import {
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  logger,
} from '@/shared/utils';

const log = logger.child('folder-tree:monitor');
import { fetchWorkflowProjectId } from '../api';
import { removeFolderTree, tryInject } from './injector';

const ACTIVE_POLL_INTERVAL = 500;
const IDLE_POLL_INTERVAL = 2000;
const IDLE_TIMEOUT = 5000;
const ACTIVITY_THROTTLE = 200;

interface MonitorState {
  currentProjectId: string | null;
  currentPath: string | null;
  intervalId: ReturnType<typeof setInterval> | null;
  isIdle: boolean;
  idleTimeout: ReturnType<typeof setTimeout> | null;
  lastActivityTime: number;
}

const state: MonitorState = {
  currentProjectId: null,
  currentPath: null,
  intervalId: null,
  isIdle: false,
  idleTimeout: null,
  lastActivityTime: 0,
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
    removeFolderTree();
    state.currentProjectId = null;
    state.currentPath = null;
    return;
  }

  const normalizedPath = getNormalizedContextPath();
  const contextChanged =
    projectId !== state.currentProjectId || normalizedPath !== state.currentPath;

  if (contextChanged) {
    log.debug('Context changed', {
      from: state.currentProjectId,
      to: projectId,
    });

    removeFolderTree();
    state.currentProjectId = projectId;
    state.currentPath = normalizedPath;

    tryInject(projectId);
  }
}

function setPollingRate(interval: number): void {
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = setInterval(checkAndInject, interval);
}

function onUserActivity(): void {
  if (state.isIdle) {
    state.isIdle = false;
    setPollingRate(ACTIVE_POLL_INTERVAL);
  }
}

function resetIdleTimer(): void {
  const now = Date.now();
  if (now - state.lastActivityTime < ACTIVITY_THROTTLE) {
    return;
  }
  state.lastActivityTime = now;

  onUserActivity();
  if (state.idleTimeout) clearTimeout(state.idleTimeout);
  state.idleTimeout = setTimeout(() => {
    state.isIdle = true;
    setPollingRate(IDLE_POLL_INTERVAL);
  }, IDLE_TIMEOUT);
}

export function startMonitor(): void {
  log.debug('Monitor started');
  checkAndInject();
  setPollingRate(ACTIVE_POLL_INTERVAL);

  document.addEventListener('mousemove', resetIdleTimer, { passive: true });
  document.addEventListener('keydown', resetIdleTimer, { passive: true });
  document.addEventListener('click', resetIdleTimer, { passive: true });
}

export function stopMonitor(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  if (state.idleTimeout) {
    clearTimeout(state.idleTimeout);
    state.idleTimeout = null;
  }

  document.removeEventListener('mousemove', resetIdleTimer);
  document.removeEventListener('keydown', resetIdleTimer);
  document.removeEventListener('click', resetIdleTimer);
}

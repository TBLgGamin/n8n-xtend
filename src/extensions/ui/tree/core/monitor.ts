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
const IDLE_INTERVAL = 2000;
const IDLE_TIMEOUT = 5000;

interface MonitorState {
  currentProjectId: string | null;
  currentPath: string | null;
  intervalId: ReturnType<typeof setInterval> | null;
  isIdle: boolean;
  idleTimeout: ReturnType<typeof setTimeout> | null;
}

const state: MonitorState = {
  currentProjectId: null,
  currentPath: null,
  intervalId: null,
  isIdle: false,
  idleTimeout: null,
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

function setPollingRate(interval: number): void {
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = setInterval(checkAndInject, interval);
}

function onUserActivity(): void {
  if (state.isIdle) {
    state.isIdle = false;
    setPollingRate(POLL_INTERVAL);
  }
}

function resetIdleTimer(): void {
  onUserActivity();
  if (state.idleTimeout) clearTimeout(state.idleTimeout);
  state.idleTimeout = setTimeout(() => {
    state.isIdle = true;
    setPollingRate(IDLE_INTERVAL);
  }, IDLE_TIMEOUT);
}

export function startMonitor(): void {
  log.info('Monitor started');
  setPollingRate(POLL_INTERVAL);

  document.addEventListener('mousemove', resetIdleTimer, { passive: true });
  document.addEventListener('keydown', resetIdleTimer, { passive: true });
  document.addEventListener('click', resetIdleTimer, { passive: true });
}

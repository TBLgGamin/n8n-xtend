import type { WorkflowDetail } from '@/shared/types';
import { getLocalItem, logger, removeLocalItem, setLocalItem } from '@/shared/utils';

const log = logger.child('graph:state');

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'n8n-xtend-graph-cache';

type GraphStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface GraphState {
  projectId: string;
  workflows: Map<string, WorkflowDetail>;
  status: GraphStatus;
  timestamp: number;
}

interface StoredGraphCache {
  projectId: string;
  workflows: [string, WorkflowDetail][];
  timestamp: number;
}

let state: GraphState | null = null;

export function getGraphState(): GraphState | null {
  return state;
}

export function setGraphState(
  projectId: string,
  workflows: Map<string, WorkflowDetail>,
  status: GraphStatus,
): void {
  state = { projectId, workflows, status, timestamp: Date.now() };
  log.debug('State updated', { projectId, status, size: workflows.size });

  if (status === 'loaded' && workflows.size > 0) {
    const stored: StoredGraphCache = {
      projectId,
      workflows: [...workflows.entries()],
      timestamp: state.timestamp,
    };
    setLocalItem(STORAGE_KEY, stored);
    log.debug(`Persisted ${workflows.size} workflows to storage`);
  }
}

export function updateGraphStatus(status: GraphStatus): void {
  if (state) {
    state.status = status;
    log.debug('Status updated', { status });
  }
}

export function clearGraphState(): void {
  log.debug('Clearing graph state and storage');
  state = null;
  removeLocalItem(STORAGE_KEY);
}

function restoreFromStorage(projectId: string): boolean {
  const stored = getLocalItem<StoredGraphCache>(STORAGE_KEY);
  if (!stored) {
    log.debug('No stored cache found');
    return false;
  }
  if (stored.projectId !== projectId) {
    log.debug('Stored cache is for different project', {
      stored: stored.projectId,
      requested: projectId,
    });
    return false;
  }
  const age = Date.now() - stored.timestamp;
  if (age >= CACHE_TTL_MS) {
    log.debug('Stored cache expired', { ageMs: age, ttlMs: CACHE_TTL_MS });
    return false;
  }

  state = {
    projectId: stored.projectId,
    workflows: new Map(stored.workflows),
    status: 'loaded',
    timestamp: stored.timestamp,
  };
  log.debug(`Restored ${state.workflows.size} workflows from storage`, { ageMs: age });
  return true;
}

export function isCacheValid(projectId: string): boolean {
  if (state?.projectId === projectId && state.status === 'loaded') {
    const age = Date.now() - state.timestamp;
    const valid = age < CACHE_TTL_MS;
    log.debug('In-memory cache check', { valid, ageMs: age });
    return valid;
  }
  log.debug('No in-memory cache, trying storage');
  return restoreFromStorage(projectId);
}

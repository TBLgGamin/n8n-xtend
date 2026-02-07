import type { WorkflowDetail } from '@/shared/types';

const CACHE_TTL_MS = 5 * 60 * 1000;

type GraphStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface GraphState {
  projectId: string;
  workflows: Map<string, WorkflowDetail>;
  status: GraphStatus;
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
}

export function updateGraphStatus(status: GraphStatus): void {
  if (state) {
    state.status = status;
  }
}

export function clearGraphState(): void {
  state = null;
}

export function isCacheValid(projectId: string): boolean {
  if (!state) return false;
  if (state.projectId !== projectId) return false;
  if (state.status !== 'loaded') return false;
  return Date.now() - state.timestamp < CACHE_TTL_MS;
}

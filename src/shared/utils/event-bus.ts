import type { TreeItemType } from '@/shared/types';
import { logger } from './logger';

const log = logger.child('event-bus');

export interface MoveOperation {
  type: TreeItemType;
  id: string;
  name: string;
  fromFolderId: string;
  toFolderId: string;
  projectId: string;
}

export interface SelectionState {
  items: Array<{ type: TreeItemType; id: string; name: string; parentFolderId?: string }>;
}

export interface EventMap {
  'folder-tree:navigated': { projectId: string; folderId?: string; workflowId?: string };
  'folder-tree:item-moved': MoveOperation;
  'folder-tree:item-copied': MoveOperation;
  'folder-tree:items-moved': { operations: MoveOperation[] };
  'folder-tree:items-copied': { operations: MoveOperation[] };
  'folder-tree:selection-changed': SelectionState;
  'folder-tree:tree-loaded': { projectId: string };
  'folder-tree:tree-refreshed': { projectId: string };
  'graph:activated': { projectId: string };
  'graph:deactivated': Record<string, never>;
  'graph:workflow-clicked': { workflowId: string };
  'capture:exported': { workflowId: string; format: 'png' | 'svg' };
  'note-title:renamed': { noteId: string; title: string };
  'workflow-lint:applied': { workflowId: string; changes: string[] };
  'workflow-lint:config-changed': Record<string, never>;
  'undo:requested': Record<string, never>;
  'undo:operation-registered': { description: string };
}

type EventHandler<T> = (payload: T) => void;

type HandlerMap = {
  [K in keyof EventMap]?: Set<EventHandler<EventMap[K]>>;
};

const handlers: HandlerMap = {};

export function emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
  log.debug(`Event: ${event}`);
  const eventHandlers = handlers[event] as Set<EventHandler<EventMap[K]>> | undefined;
  if (!eventHandlers) return;

  for (const handler of eventHandlers) {
    try {
      handler(payload);
    } catch (error) {
      log.error(`Handler error for ${event}`, error);
    }
  }
}

export function on<K extends keyof EventMap>(
  event: K,
  handler: EventHandler<EventMap[K]>,
): () => void {
  if (!handlers[event]) {
    (handlers as Record<string, Set<EventHandler<unknown>>>)[event] = new Set();
  }
  const eventHandlers = handlers[event] as Set<EventHandler<EventMap[K]>>;
  eventHandlers.add(handler);

  return () => {
    eventHandlers.delete(handler);
    if (eventHandlers.size === 0) {
      delete handlers[event];
    }
  };
}

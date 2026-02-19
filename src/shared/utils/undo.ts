import { emit, on } from './event-bus';
import { logger } from './logger';
import { showToast } from './toast';

const log = logger.child('undo');

export interface UndoableOperation {
  description: string;
  undo: () => Promise<boolean>;
}

let lastOperation: UndoableOperation | null = null;

export function registerUndo(operation: UndoableOperation): void {
  lastOperation = operation;
  emit('undo:operation-registered', { description: operation.description });
  log.debug('Undo registered', { description: operation.description });

  showToast({
    message: operation.description,
    action: {
      label: 'Undo',
      onClick: executeUndo,
    },
  });
}

async function executeUndo(): Promise<void> {
  if (!lastOperation) return;

  const op = lastOperation;
  lastOperation = null;
  log.debug('Executing undo', { description: op.description });

  const success = await op.undo();
  if (success) {
    showToast({ message: `Undone: ${op.description}` });
  } else {
    showToast({ message: 'Undo failed' });
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    if (lastOperation) {
      event.preventDefault();
      executeUndo();
    }
  }
}

export function initUndoSystem(): void {
  on('undo:requested', () => {
    executeUndo();
  });
  document.addEventListener('keydown', handleKeydown);
  log.debug('Undo system initialized');
}

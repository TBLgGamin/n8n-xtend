import {
  type MutationMonitor,
  createMutationMonitor,
  isWorkflowPage,
  logger,
} from '@/shared/utils';
import { attachKeyboardListener, detachKeyboardListener } from './injector';

const log = logger.child('note-title');

const CANVAS_SELECTOR = '.vue-flow';
const MARKER_ATTR = 'data-n8n-note-title';

let attached = false;

function handleMutation(): void {
  if (!isWorkflowPage()) {
    if (attached) {
      detachKeyboardListener();
      attached = false;
    }
    return;
  }

  const canvas = document.querySelector(CANVAS_SELECTOR);
  if (!canvas || canvas.hasAttribute(MARKER_ATTR)) return;

  canvas.setAttribute(MARKER_ATTR, 'true');
  attachKeyboardListener();
  attached = true;
  log.debug('Keyboard listener attached');
}

const monitor: MutationMonitor = createMutationMonitor({
  onMutation: handleMutation,
  onStart: () => log.debug('Note title monitor started'),
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

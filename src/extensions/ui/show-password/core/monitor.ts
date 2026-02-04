import { type MutationMonitor, createMutationMonitor, logger } from '@/shared/utils';
import { injectToggle } from './injector';

const log = logger.child('show-password:monitor');
const MARKER_ATTR = 'data-xtend-password-toggle';
const PASSWORD_SELECTOR = `input.el-input__inner[type="password"]:not([${MARKER_ATTR}])`;

function findPasswordInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(PASSWORD_SELECTOR));
}

function processPasswordInputs(): void {
  const inputs = findPasswordInputs();
  for (const input of inputs) {
    injectToggle(input);
  }
}

function hasPasswordInput(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return (
    node.matches?.('input[type="password"]') || !!node.querySelector?.('input[type="password"]')
  );
}

function handleMutation(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) continue;
    for (const node of mutation.addedNodes) {
      if (hasPasswordInput(node)) {
        processPasswordInputs();
        return;
      }
    }
  }
}

const monitor: MutationMonitor = createMutationMonitor({
  onMutation: handleMutation,
  onStart: () => {
    log.debug('Starting password visibility monitor');
    processPasswordInputs();
  },
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

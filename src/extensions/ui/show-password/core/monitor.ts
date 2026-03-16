import { type MutationMonitor, createMutationMonitor, logger } from '@/shared/utils';
import { MARKER_ATTR, injectToggle } from './injector';

const log = logger.child('show-password:monitor');
const PASSWORD_SELECTOR = `input[type="password"]:not([${MARKER_ATTR}])`;

function findPasswordInputs(): HTMLInputElement[] {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(PASSWORD_SELECTOR));
  if (inputs.length > 0) {
    log.debug(`Found ${inputs.length} unprocessed password input(s)`);
  }
  return inputs;
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
  let addedNodes = 0;
  for (const mutation of mutations) {
    if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) continue;
    addedNodes += mutation.addedNodes.length;
    for (const node of mutation.addedNodes) {
      if (hasPasswordInput(node)) {
        log.debug('Password input detected in DOM mutation', {
          tagName: (node as HTMLElement).tagName,
          addedNodes,
        });
        processPasswordInputs();
        return;
      }
    }
  }
}

const monitor: MutationMonitor = createMutationMonitor({
  onMutation: handleMutation,
  onStart: () => {
    log.debug('Password visibility monitor started');
    processPasswordInputs();
  },
  onStop: () => {
    log.debug('Password visibility monitor stopped');
  },
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

import { logger } from '@/shared/utils';
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
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  return (
    node.matches?.('input[type="password"]') || !!node.querySelector?.('input[type="password"]')
  );
}

function mutationsContainPasswordInput(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
      continue;
    }
    for (const node of mutation.addedNodes) {
      if (hasPasswordInput(node)) {
        return true;
      }
    }
  }
  return false;
}

export function startMonitor(): void {
  log.info('Starting password visibility monitor');

  processPasswordInputs();

  const observer = new MutationObserver((mutations) => {
    if (mutationsContainPasswordInput(mutations)) {
      processPasswordInputs();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  log.debug('MutationObserver started');
}

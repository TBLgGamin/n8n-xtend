import {
  type MutationMonitor,
  createMutationMonitor,
  isWorkflowPage,
  logger,
} from '@/shared/utils';
import { handleAutoLintSave, injectLintMenuItems } from './injector';

const log = logger.child('lint:monitor');

const WORKFLOW_MENU_SELECTOR = '.el-dropdown__popper ul.el-dropdown-menu';
const DOWNLOAD_ITEM_SELECTOR = '[data-test-id="workflow-menu-item-download"]';

const processedMenus = new WeakSet<Element>();

function findWorkflowMenu(node: Node): Element | null {
  if (!(node instanceof Element)) return null;
  if (node.matches(WORKFLOW_MENU_SELECTOR)) return node;
  return node.querySelector(WORKFLOW_MENU_SELECTOR);
}

function tryInjectLintItems(menu: Element): void {
  if (processedMenus.has(menu)) return;

  const downloadItem = menu.querySelector(DOWNLOAD_ITEM_SELECTOR);
  if (!downloadItem) return;

  processedMenus.add(menu);
  log.debug('Workflow menu detected, injecting lint items');
  injectLintMenuItems(menu as HTMLElement, downloadItem as HTMLElement);
}

function handleMutation(mutations: MutationRecord[]): void {
  if (!isWorkflowPage()) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      const menu = findWorkflowMenu(node);
      if (menu) tryInjectLintItems(menu);
    }
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isWorkflowPage()) return;
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    handleAutoLintSave();
  }
}

const monitor: MutationMonitor = createMutationMonitor({
  onMutation: handleMutation,
  onStart: () => {
    document.addEventListener('keydown', handleKeydown);
    log.debug('Lint monitor started');
  },
});

export function startMonitor(): void {
  monitor.start();
}

export function stopMonitor(): void {
  document.removeEventListener('keydown', handleKeydown);
  monitor.stop();
}

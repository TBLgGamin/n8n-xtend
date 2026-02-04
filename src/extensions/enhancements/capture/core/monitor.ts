import { type MutationMonitor, createMutationMonitor, logger } from '@/shared/utils';
import { injectCaptureMenuItem } from './injector';

const log = logger.child('capture');

const WORKFLOW_MENU_SELECTOR = '.el-dropdown__popper ul.el-dropdown-menu';
const DOWNLOAD_ITEM_SELECTOR = '[data-test-id="workflow-menu-item-download"]';

const processedMenus = new WeakSet<Element>();

function isWorkflowPage(): boolean {
  return location.pathname.includes('/workflow/');
}

function findWorkflowMenu(node: Node): Element | null {
  if (!(node instanceof Element)) return null;
  if (node.matches(WORKFLOW_MENU_SELECTOR)) return node;
  return node.querySelector(WORKFLOW_MENU_SELECTOR);
}

function tryInjectCaptureItem(menu: Element): void {
  if (processedMenus.has(menu)) return;

  const downloadItem = menu.querySelector(DOWNLOAD_ITEM_SELECTOR);
  if (!downloadItem) return;

  processedMenus.add(menu);
  log.debug('Workflow menu detected, injecting capture item');
  injectCaptureMenuItem(menu as HTMLElement, downloadItem as HTMLElement);
}

function handleMutation(mutations: MutationRecord[]): void {
  if (!isWorkflowPage()) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      const menu = findWorkflowMenu(node);
      if (menu) tryInjectCaptureItem(menu);
    }
  }
}

const monitor: MutationMonitor = createMutationMonitor({
  onMutation: handleMutation,
  onStart: () => log.debug('Capture monitor started'),
});

export const startMonitor = monitor.start;
export const stopMonitor = monitor.stop;

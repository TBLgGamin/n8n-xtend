import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startMonitor, stopMonitor } from './monitor';

vi.mock('./injector', () => ({
  injectCaptureMenuItem: vi.fn(),
}));

function mockLocation(pathname: string): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, hostname: 'localhost', origin: 'http://localhost' },
    writable: true,
    configurable: true,
  });
}

function createWorkflowMenu(): HTMLElement {
  const menu = document.createElement('ul');
  menu.className = 'el-dropdown-menu';

  const downloadItem = document.createElement('div');
  downloadItem.setAttribute('data-test-id', 'workflow-menu-item-download');
  menu.appendChild(downloadItem);

  const popper = document.createElement('div');
  popper.className = 'el-dropdown__popper';
  popper.appendChild(menu);

  const wrapper = document.createElement('div');
  wrapper.appendChild(popper);

  return wrapper;
}

describe('startMonitor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockLocation('/workflow/wf-123');
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopMonitor();
  });

  it('starts mutation observer', () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

    startMonitor();

    expect(observeSpy).toHaveBeenCalledWith(document.body, {
      childList: true,
      subtree: true,
    });
  });

  it('does not start twice', () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

    startMonitor();
    startMonitor();

    expect(observeSpy).toHaveBeenCalledTimes(1);
  });

  it.skip('injects menu item when workflow menu appears', async () => {
    const { injectCaptureMenuItem } = await import('./injector');

    startMonitor();

    const wrapper = createWorkflowMenu();
    document.body.appendChild(wrapper);

    await Promise.resolve();
    await Promise.resolve();

    expect(injectCaptureMenuItem).toHaveBeenCalled();
  });

  it('does not inject on non-workflow pages', async () => {
    mockLocation('/projects/proj-1/workflows');
    const { injectCaptureMenuItem } = await import('./injector');

    startMonitor();

    const popper = createWorkflowMenu();
    document.body.appendChild(popper);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(injectCaptureMenuItem).not.toHaveBeenCalled();
  });

  it('does not inject when download item not found', async () => {
    const { injectCaptureMenuItem } = await import('./injector');

    startMonitor();

    const menu = document.createElement('ul');
    menu.className = 'el-dropdown-menu';
    const popper = document.createElement('div');
    popper.className = 'el-dropdown__popper';
    popper.appendChild(menu);
    document.body.appendChild(popper);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(injectCaptureMenuItem).not.toHaveBeenCalled();
  });

  it.skip('does not inject twice for same menu', async () => {
    const { injectCaptureMenuItem } = await import('./injector');

    startMonitor();

    const wrapper = createWorkflowMenu();
    document.body.appendChild(wrapper);

    await Promise.resolve();
    await Promise.resolve();

    expect(injectCaptureMenuItem).toHaveBeenCalledTimes(1);

    document.body.removeChild(wrapper);
    document.body.appendChild(wrapper);

    await Promise.resolve();
    await Promise.resolve();

    expect(injectCaptureMenuItem).toHaveBeenCalledTimes(1);
  });
});

describe('stopMonitor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockLocation('/workflow/wf-123');
    vi.clearAllMocks();
  });

  it('disconnects mutation observer', () => {
    const disconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect');

    startMonitor();
    stopMonitor();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('does nothing when not started', () => {
    expect(() => stopMonitor()).not.toThrow();
  });

  it('allows starting again after stop', () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

    startMonitor();
    stopMonitor();
    startMonitor();

    expect(observeSpy).toHaveBeenCalledTimes(2);
  });
});

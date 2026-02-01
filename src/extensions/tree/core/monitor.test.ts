import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startMonitor } from './monitor';

vi.mock('../api', () => ({
  fetchWorkflowProjectId: vi.fn().mockResolvedValue('project-1'),
}));

vi.mock('./injector', () => ({
  tryInject: vi.fn(),
  removeTree: vi.fn(),
}));

function mockLocation(pathname: string, hostname = 'localhost'): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, hostname, origin: 'http://localhost' },
    writable: true,
    configurable: true,
  });
}

describe('startMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLocation('/projects/proj-1/workflows');
    document.body.innerHTML = '<div id="sidebar"></div>';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts polling interval', async () => {
    startMonitor();

    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it('injects tree when sidebar exists and project in URL', async () => {
    const { tryInject } = await import('./injector');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(tryInject).toHaveBeenCalledWith('proj-1');
  });

  it('removes tree when no project in URL', async () => {
    mockLocation('/settings');
    const { removeTree } = await import('./injector');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(removeTree).toHaveBeenCalled();
  });

  it('fetches project ID from workflow when not in URL', async () => {
    mockLocation('/workflow/wf-123');
    const { fetchWorkflowProjectId } = await import('../api');
    const { tryInject } = await import('./injector');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchWorkflowProjectId).toHaveBeenCalledWith('wf-123');
    expect(tryInject).toHaveBeenCalledWith('project-1');
  });

  it('does not inject on auth pages', async () => {
    mockLocation('/signin');
    const { tryInject } = await import('./injector');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(tryInject).not.toHaveBeenCalled();
  });

  it('does not inject when sidebar not found', async () => {
    document.body.innerHTML = '';
    const { tryInject } = await import('./injector');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(tryInject).not.toHaveBeenCalled();
  });

  it('re-injects when context changes', async () => {
    const { tryInject, removeTree } = await import('./injector');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(tryInject).toHaveBeenCalledWith('proj-1');

    mockLocation('/projects/proj-2/workflows');
    await vi.advanceTimersByTimeAsync(500);

    expect(removeTree).toHaveBeenCalled();
    expect(tryInject).toHaveBeenCalledWith('proj-2');
  });

  it('adds user activity listeners', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    startMonitor();

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), {
      passive: true,
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), {
      passive: true,
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), {
      passive: true,
    });
  });

  it('slows polling when idle', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    startMonitor();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500);

    document.dispatchEvent(new MouseEvent('mousemove'));

    await vi.advanceTimersByTimeAsync(6000);

    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 2000);
  });

  it('speeds up polling on user activity', async () => {
    startMonitor();

    await vi.advanceTimersByTimeAsync(6000);

    document.dispatchEvent(new MouseEvent('mousemove'));

    await vi.advanceTimersByTimeAsync(100);

    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});

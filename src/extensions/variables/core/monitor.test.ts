import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startMonitor, stopMonitor } from './monitor';

vi.mock('./enhancer', () => ({
  enhanceUsageSyntax: vi.fn().mockReturnValue(0),
}));

function mockLocation(pathname: string): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, hostname: 'localhost', origin: 'http://localhost' },
    writable: true,
    configurable: true,
  });
}

describe('startMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLocation('/projects/proj-1/variables');
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopMonitor();
    vi.useRealTimers();
  });

  it('starts polling interval', () => {
    startMonitor();

    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it('does not start twice', () => {
    startMonitor();
    const initialTimerCount = vi.getTimerCount();

    startMonitor();

    expect(vi.getTimerCount()).toBe(initialTimerCount);
  });

  it('enhances syntax on variables page', async () => {
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(enhanceUsageSyntax).toHaveBeenCalled();
  });

  it('enhances immediately on start', async () => {
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();

    expect(enhanceUsageSyntax).toHaveBeenCalled();
  });

  it('does not enhance on non-variables pages', async () => {
    mockLocation('/projects/proj-1/workflows');
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(enhanceUsageSyntax).not.toHaveBeenCalled();
  });

  it('polls at correct interval', async () => {
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();

    await vi.advanceTimersByTimeAsync(500);
    const callsAfterFirst = (enhanceUsageSyntax as ReturnType<typeof vi.fn>).mock.calls.length;

    await vi.advanceTimersByTimeAsync(500);
    const callsAfterSecond = (enhanceUsageSyntax as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
  });

  it('handles path with variables anywhere', async () => {
    mockLocation('/some/path/variables/settings');
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(enhanceUsageSyntax).toHaveBeenCalled();
  });
});

describe('stopMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLocation('/projects/proj-1/variables');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears polling interval', () => {
    startMonitor();
    stopMonitor();

    const timerCountBefore = vi.getTimerCount();
    vi.advanceTimersByTime(1000);
    const timerCountAfter = vi.getTimerCount();

    expect(timerCountBefore).toBe(timerCountAfter);
  });

  it('does nothing when not started', () => {
    expect(() => stopMonitor()).not.toThrow();
  });

  it('allows starting again after stop', async () => {
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();
    stopMonitor();

    vi.clearAllMocks();

    startMonitor();
    await vi.advanceTimersByTimeAsync(500);

    expect(enhanceUsageSyntax).toHaveBeenCalled();
  });

  it('stops enhancing after stop', async () => {
    const { enhanceUsageSyntax } = await import('./enhancer');

    startMonitor();
    stopMonitor();

    vi.clearAllMocks();

    await vi.advanceTimersByTimeAsync(1000);

    expect(enhanceUsageSyntax).not.toHaveBeenCalled();
  });
});

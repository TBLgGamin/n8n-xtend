import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inject, removeTree, tryInject } from './injector';

vi.mock('./tree', () => ({
  loadTree: vi.fn(),
}));

vi.mock('@/shared/utils', () => ({
  getCurrentTheme: vi.fn().mockReturnValue('light'),
  onThemeChange: vi.fn().mockReturnValue(() => {}),
  logger: {
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

function createMockSidebar(): void {
  document.body.innerHTML = `
    <div id="sidebar">
      <div class="_sideMenu_abc123">
        <div class="_bottomMenu_xyz789"></div>
      </div>
    </div>
  `;
}

describe('inject', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('returns true when tree already exists', () => {
    document.body.innerHTML = '<div id="n8n-tree-view"></div>';

    const result = inject('proj-1');

    expect(result).toBe(true);
  });

  it('returns true when no project ID provided', () => {
    const result = inject('');

    expect(result).toBe(true);
  });

  it('returns false when sidebar not found', () => {
    const result = inject('proj-1');

    expect(result).toBe(false);
  });

  it('returns false when side menu not found', () => {
    document.body.innerHTML = '<div id="sidebar"></div>';

    const result = inject('proj-1');

    expect(result).toBe(false);
  });

  it('injects tree container into sidebar', () => {
    createMockSidebar();

    const result = inject('proj-1');

    expect(result).toBe(true);
    expect(document.getElementById('n8n-tree-view')).not.toBeNull();
  });

  it('creates tree content element', () => {
    createMockSidebar();

    inject('proj-1');

    expect(document.getElementById('n8n-tree-content')).not.toBeNull();
  });

  it('inserts before bottom menu', () => {
    createMockSidebar();

    inject('proj-1');

    const treeView = document.getElementById('n8n-tree-view');
    const bottomMenu = document.querySelector('[class*="_bottomMenu_"]');
    expect(treeView?.nextElementSibling).toBe(bottomMenu);
  });

  it('appends to side menu when no bottom menu', () => {
    document.body.innerHTML = `
      <div id="sidebar">
        <div class="_sideMenu_abc123"></div>
      </div>
    `;

    inject('proj-1');

    const sideMenu = document.querySelector('[class*="_sideMenu_"]');
    const treeView = document.getElementById('n8n-tree-view');
    expect(sideMenu?.lastElementChild).toBe(treeView);
  });

  it('calls loadTree with project ID', async () => {
    createMockSidebar();
    const { loadTree } = await import('./tree');

    inject('proj-1');

    expect(loadTree).toHaveBeenCalledWith(expect.any(HTMLElement), 'proj-1');
  });

  it('sets up theme change listener', async () => {
    createMockSidebar();
    const { onThemeChange } = await import('@/shared/utils');

    inject('proj-1');

    expect(onThemeChange).toHaveBeenCalled();
  });

  it('adds dark mode class when theme is dark', async () => {
    createMockSidebar();
    const { getCurrentTheme } = await import('@/shared/utils');
    (getCurrentTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');

    inject('proj-1');

    const container = document.getElementById('n8n-tree-view');
    expect(container?.classList.contains('n8n-tree-dark')).toBe(true);
  });

  it('does not add dark mode class when theme is light', async () => {
    createMockSidebar();
    const { getCurrentTheme } = await import('@/shared/utils');
    (getCurrentTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');

    inject('proj-1');

    const container = document.getElementById('n8n-tree-view');
    expect(container?.classList.contains('n8n-tree-dark')).toBe(false);
  });
});

describe('removeTree', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('removes tree container from DOM', () => {
    document.body.innerHTML = '<div id="n8n-tree-view"></div>';

    removeTree();

    expect(document.getElementById('n8n-tree-view')).toBeNull();
  });

  it('does nothing when tree does not exist', () => {
    document.body.innerHTML = '<div>Other content</div>';

    expect(() => removeTree()).not.toThrow();
  });

  it('cleans up theme listener', async () => {
    createMockSidebar();
    const mockCleanup = vi.fn();
    const { onThemeChange } = await import('@/shared/utils');
    (onThemeChange as ReturnType<typeof vi.fn>).mockReturnValue(mockCleanup);

    inject('proj-1');
    removeTree();

    expect(mockCleanup).toHaveBeenCalled();
  });
});

describe('tryInject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries when injection fails', async () => {
    tryInject('proj-1', 3, 100);

    expect(document.getElementById('n8n-tree-view')).toBeNull();

    createMockSidebar();
    await vi.advanceTimersByTimeAsync(100);

    expect(document.getElementById('n8n-tree-view')).not.toBeNull();
  });

  it('stops after max retries', async () => {
    tryInject('proj-1', 2, 50);

    await vi.advanceTimersByTimeAsync(200);

    expect(document.getElementById('n8n-tree-view')).toBeNull();
  });

  it('does not retry on success', async () => {
    createMockSidebar();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    tryInject('proj-1', 3, 100);

    await vi.advanceTimersByTimeAsync(500);

    const retryCalls = setTimeoutSpy.mock.calls.filter((call) => call[1] === 100);
    expect(retryCalls.length).toBe(0);
  });
});

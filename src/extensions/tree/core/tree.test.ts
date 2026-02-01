import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTree } from './tree';

vi.mock('../api', () => ({
  fetchFolders: vi.fn().mockResolvedValue([]),
  fetchFolderPath: vi.fn().mockResolvedValue([]),
}));

vi.mock('./dragdrop', () => ({
  setDragContext: vi.fn(),
  setupDropTarget: vi.fn(),
  setupDraggable: vi.fn(),
}));

vi.mock('./keyboard', () => ({
  initKeyboardNavigation: vi.fn(() => vi.fn()),
  resetKeyboardFocus: vi.fn(),
}));

vi.mock('./state', () => ({
  setFolderExpanded: vi.fn(),
  isFolderExpanded: vi.fn().mockReturnValue(false),
}));

function mockLocation(pathname: string): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, origin: 'http://localhost:5678', hostname: 'localhost' },
    writable: true,
    configurable: true,
  });
}

describe('loadTree', () => {
  let container: HTMLElement;
  let treeView: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    mockLocation('/projects/proj-1/workflows');
    localStorage.clear();
    document.body.innerHTML = '';

    treeView = document.createElement('div');
    treeView.id = 'n8n-tree-view';
    container = document.createElement('div');
    container.id = 'n8n-tree-content';
    treeView.appendChild(container);
    document.body.appendChild(treeView);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears container before loading', async () => {
    container.innerHTML = '<div>Old content</div>';

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(container.innerHTML).not.toContain('Old content');
  });

  it('fetches folder path when on folder page', async () => {
    mockLocation('/projects/proj-1/folders/folder-1/workflows');
    const { fetchFolderPath } = await import('../api');

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(fetchFolderPath).toHaveBeenCalledWith('folder-1');
  });

  it('expands folders in path', async () => {
    mockLocation('/projects/proj-1/folders/folder-3/workflows');
    const { fetchFolderPath } = await import('../api');
    const { setFolderExpanded } = await import('./state');

    (fetchFolderPath as ReturnType<typeof vi.fn>).mockResolvedValue([
      'folder-1',
      'folder-2',
      'folder-3',
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(setFolderExpanded).toHaveBeenCalledWith('folder-1', true);
    expect(setFolderExpanded).toHaveBeenCalledWith('folder-2', true);
    expect(setFolderExpanded).toHaveBeenCalledWith('folder-3', true);
  });

  it('sets drag context', async () => {
    const { setDragContext } = await import('./dragdrop');

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(setDragContext).toHaveBeenCalledWith('proj-1', expect.any(Function));
  });

  it('fetches folders for project', async () => {
    const { fetchFolders } = await import('../api');

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(fetchFolders).toHaveBeenCalledWith('proj-1', '0');
  });

  it('renders empty container when no items', async () => {
    const { fetchFolders } = await import('../api');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(container.innerHTML).toBe('');
  });

  it('renders workflows', async () => {
    const { fetchFolders } = await import('../api');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'wf-1', name: 'Workflow 1' },
      { id: 'wf-2', name: 'Workflow 2' },
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(container.querySelectorAll('[data-workflow-id]')).toHaveLength(2);
  });

  it('renders folders', async () => {
    const { fetchFolders } = await import('../api');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'folder-1', name: 'Folder 1', resource: 'folder' },
      { id: 'folder-2', name: 'Folder 2', resource: 'folder' },
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(container.querySelectorAll('[data-folder-id]')).toHaveLength(2);
  });

  it('renders workflows before folders', async () => {
    const { fetchFolders } = await import('../api');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'folder-1', name: 'Folder 1', resource: 'folder' },
      { id: 'wf-1', name: 'Workflow 1' },
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    const nodes = container.querySelectorAll('.n8n-tree-node');
    expect(nodes[0]?.getAttribute('data-workflow-id')).toBe('wf-1');
    expect(nodes[1]?.getAttribute('data-folder-id')).toBe('folder-1');
  });

  it('sets up container as root drop target', async () => {
    const { fetchFolders } = await import('../api');
    const { setupDropTarget } = await import('./dragdrop');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'wf-1', name: 'Workflow' },
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(setupDropTarget).toHaveBeenCalledWith(container, '0', true);
  });

  it('initializes keyboard navigation', async () => {
    const { fetchFolders } = await import('../api');
    const { initKeyboardNavigation } = await import('./keyboard');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'wf-1', name: 'Workflow' },
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(initKeyboardNavigation).toHaveBeenCalledWith(treeView);
  });

  it('resets keyboard focus on load', async () => {
    const { fetchFolders } = await import('../api');
    const { resetKeyboardFocus } = await import('./keyboard');
    (fetchFolders as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'wf-1', name: 'Workflow' },
    ]);

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(resetKeyboardFocus).toHaveBeenCalled();
  });

  it('shows error message on fetch failure', async () => {
    const { fetchFolders } = await import('../api');
    (fetchFolders as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const promise = loadTree(container, 'proj-1');
    await vi.runAllTimersAsync();
    await promise;

    expect(container.innerHTML).toContain('Failed to load');
    expect(container.querySelector('.n8n-tree-error')).not.toBeNull();
  });
});

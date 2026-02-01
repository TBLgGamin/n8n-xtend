import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWorkflowProjectId, fetchWorkflowVersionId, moveWorkflow } from './workflows';

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('fetchWorkflowProjectId', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'http://localhost:5678', pathname: '/', hostname: 'localhost' },
      writable: true,
      configurable: true,
    });
    localStorage.setItem('n8n-browserId', 'test-id');
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches and returns project ID', async () => {
    const { fetchWorkflowProjectId: fn } = await import('./workflows');
    const mockData = {
      data: { id: 'wf-fetch-1', name: 'Workflow', homeProject: { id: 'project-123' } },
    };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise = fn('wf-fetch-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:5678/rest/workflows/wf-fetch-1',
      expect.any(Object),
    );
    expect(result).toBe('project-123');
  });

  it('returns cached project ID on second call', async () => {
    const { fetchWorkflowProjectId: fn } = await import('./workflows');
    const mockData = {
      data: { id: 'wf-cached', name: 'Workflow', homeProject: { id: 'cached-project' } },
    };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise1 = fn('wf-cached');
    await vi.runAllTimersAsync();
    await promise1;

    const promise2 = fn('wf-cached');
    await vi.runAllTimersAsync();
    const result2 = await promise2;

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result2).toBe('cached-project');
  });

  it('returns null when homeProject is missing', async () => {
    const { fetchWorkflowProjectId: fn } = await import('./workflows');
    const mockData = { data: { id: 'wf-no-home', name: 'Workflow' } };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise = fn('wf-no-home');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const promise = fetchWorkflowProjectId('wf-error');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it('returns null when data is undefined', async () => {
    const { fetchWorkflowProjectId: fn } = await import('./workflows');
    globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse({})) as unknown as typeof fetch;

    const promise = fn('wf-undefined-data');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });
});

describe('fetchWorkflowVersionId', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'http://localhost:5678', pathname: '/', hostname: 'localhost' },
      writable: true,
      configurable: true,
    });
    localStorage.setItem('n8n-browserId', 'test-id');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches and returns version ID', async () => {
    const mockData = { data: { versionId: 'v123' } };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise = fetchWorkflowVersionId('wf-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('v123');
  });

  it('returns null when versionId is missing', async () => {
    const mockData = { data: {} };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise = fetchWorkflowVersionId('wf-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const promise = fetchWorkflowVersionId('wf-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });
});

describe('moveWorkflow', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'http://localhost:5678', pathname: '/', hostname: 'localhost' },
      writable: true,
      configurable: true,
    });
    localStorage.setItem('n8n-browserId', 'test-id');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves workflow to new folder', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({ data: { versionId: 'v1' } }))
      .mockResolvedValueOnce(createMockResponse({ success: true })) as unknown as typeof fetch;

    const promise = moveWorkflow('wf-1', 'folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      'http://localhost:5678/rest/workflows/wf-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ parentFolderId: 'folder-1', versionId: 'v1' }),
      }),
    );
    expect(result).toBe(true);
  });

  it('moves workflow to root (null parentFolderId)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({ data: { versionId: 'v2' } }))
      .mockResolvedValueOnce(createMockResponse({ success: true })) as unknown as typeof fetch;

    const promise = moveWorkflow('wf-1', '0');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ parentFolderId: null, versionId: 'v2' }),
      }),
    );
    expect(result).toBe(true);
  });

  it('returns false when version fetch fails', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const promise = moveWorkflow('wf-1', 'folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
  });

  it('returns false when versionId is null', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({ data: {} })) as unknown as typeof fetch;

    const promise = moveWorkflow('wf-1', 'folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
  });

  it('returns false when patch fails', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockResponse({ data: { versionId: 'v1' } }))
      .mockRejectedValueOnce(new Error('Patch failed')) as unknown as typeof fetch;

    const promise = moveWorkflow('wf-1', 'folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
  });
});

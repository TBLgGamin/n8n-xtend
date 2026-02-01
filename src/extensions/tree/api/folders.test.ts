import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFolder, fetchFolderPath, fetchFolders, moveFolder } from './folders';

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('fetchFolders', () => {
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

  it('fetches folders with correct filter params', async () => {
    const mockData = {
      data: [
        { id: 'folder-1', name: 'Folder 1', resource: 'folder' },
        { id: 'wf-1', name: 'Workflow 1' },
      ],
    };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise = fetchFolders('project-1', '0');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/workflows?'),
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('includeScopes=true'),
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('includeFolders=true'),
      expect.any(Object),
    );
    expect(result).toEqual(mockData.data);
  });

  it('uses default parentFolderId of 0', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({ data: [] })) as unknown as typeof fetch;

    const promise = fetchFolders('project-1');
    await vi.runAllTimersAsync();
    await promise;

    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const call = mockFetch.mock.calls[0];
    const url = call?.[0] as string;
    expect(url).toContain(encodeURIComponent('"parentFolderId":"0"'));
  });

  it('encodes filter as JSON', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({ data: [] })) as unknown as typeof fetch;

    const promise = fetchFolders('project-1', 'folder-1');
    await vi.runAllTimersAsync();
    await promise;

    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const call = mockFetch.mock.calls[0];
    const url = call?.[0] as string;
    expect(url).toContain(encodeURIComponent('"parentFolderId":"folder-1"'));
    expect(url).toContain(encodeURIComponent('"projectId":"project-1"'));
    expect(url).toContain(encodeURIComponent('"isArchived":false'));
  });

  it('returns empty array when data is undefined', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse({})) as unknown as typeof fetch;

    const promise = fetchFolders('project-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual([]);
  });
});

describe('fetchFolder', () => {
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

  it('fetches single folder by ID', async () => {
    const mockData = {
      data: { id: 'folder-1', name: 'Test Folder', resource: 'folder', parentFolderId: '0' },
    };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse(mockData)) as unknown as typeof fetch;

    const promise = fetchFolder('folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:5678/rest/folders/folder-1',
      expect.any(Object),
    );
    expect(result).toEqual(mockData.data);
  });

  it('returns null on error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const promise = fetchFolder('folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it('returns null when data is undefined', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse({})) as unknown as typeof fetch;

    const promise = fetchFolder('folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });
});

describe('fetchFolderPath', () => {
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

  it('returns path for nested folder', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({ data: { id: 'folder-3', parentFolderId: 'folder-2' } }),
      )
      .mockResolvedValueOnce(
        createMockResponse({ data: { id: 'folder-2', parentFolderId: 'folder-1' } }),
      )
      .mockResolvedValueOnce(
        createMockResponse({ data: { id: 'folder-1', parentFolderId: '0' } }),
      ) as unknown as typeof fetch;

    const promise = fetchFolderPath('folder-3');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(['folder-1', 'folder-2', 'folder-3']);
  });

  it('returns single item for root-level folder', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({ data: { id: 'folder-1', parentFolderId: '0' } }),
      ) as unknown as typeof fetch;

    const promise = fetchFolderPath('folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(['folder-1']);
  });

  it('stops at root (parentFolderId 0)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({ data: { id: 'folder-1', parentFolderId: '0' } }),
      ) as unknown as typeof fetch;

    const promise = fetchFolderPath('folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['folder-1']);
  });

  it('handles null folder response', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Not found')) as unknown as typeof fetch;

    const promise = fetchFolderPath('folder-1');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(['folder-1']);
  });
});

describe('moveFolder', () => {
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

  it('moves folder successfully', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({ success: true })) as unknown as typeof fetch;

    const promise = moveFolder('project-1', 'folder-1', 'folder-2');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:5678/rest/projects/project-1/folders/folder-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ parentFolderId: 'folder-2' }),
      }),
    );
    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const promise = moveFolder('project-1', 'folder-1', 'folder-2');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
  });

  it('returns false on non-ok response', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createMockResponse({}, 400)) as unknown as typeof fetch;

    const promise = moveFolder('project-1', 'folder-1', 'folder-2');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
  });
});

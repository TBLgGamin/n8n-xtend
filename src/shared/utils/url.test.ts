import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildWorkflowUrl,
  getFolderIdFromUrl,
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
  isN8nHost,
} from './url';

function mockLocation(pathname: string, hostname = 'localhost', origin = 'http://localhost'): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, hostname, origin },
    writable: true,
    configurable: true,
  });
}

describe('getProjectIdFromUrl', () => {
  it('extracts project ID from URL', () => {
    mockLocation('/projects/abc123/workflows');
    expect(getProjectIdFromUrl()).toBe('abc123');
  });

  it('returns null when no project in URL', () => {
    mockLocation('/workflows');
    expect(getProjectIdFromUrl()).toBeNull();
  });

  it('extracts project ID from nested path', () => {
    mockLocation('/projects/proj-1/folders/folder-1/workflows');
    expect(getProjectIdFromUrl()).toBe('proj-1');
  });

  it('handles project ID at end of path', () => {
    mockLocation('/projects/my-project');
    expect(getProjectIdFromUrl()).toBe('my-project');
  });
});

describe('getWorkflowIdFromUrl', () => {
  it('extracts workflow ID from URL', () => {
    mockLocation('/workflow/xyz789');
    expect(getWorkflowIdFromUrl()).toBe('xyz789');
  });

  it('returns null when no workflow in URL', () => {
    mockLocation('/projects/abc');
    expect(getWorkflowIdFromUrl()).toBeNull();
  });

  it('extracts workflow ID with query params', () => {
    mockLocation('/workflow/wf123');
    expect(getWorkflowIdFromUrl()).toBe('wf123');
  });

  it('handles numeric workflow IDs', () => {
    mockLocation('/workflow/12345');
    expect(getWorkflowIdFromUrl()).toBe('12345');
  });
});

describe('getFolderIdFromUrl', () => {
  it('extracts folder ID from URL', () => {
    mockLocation('/projects/abc/folders/folder123');
    expect(getFolderIdFromUrl()).toBe('folder123');
  });

  it('returns null when no folder in URL', () => {
    mockLocation('/projects/abc');
    expect(getFolderIdFromUrl()).toBeNull();
  });

  it('extracts folder ID from nested path', () => {
    mockLocation('/projects/abc/folders/folder123/workflows');
    expect(getFolderIdFromUrl()).toBe('folder123');
  });

  it('handles various folder ID formats', () => {
    mockLocation('/projects/abc/folders/fold-123-abc');
    expect(getFolderIdFromUrl()).toBe('fold-123-abc');
  });
});

describe('getNormalizedContextPath', () => {
  it('returns project path with folder', () => {
    mockLocation('/projects/proj1/folders/fold1/workflows');
    expect(getNormalizedContextPath()).toBe('/projects/proj1/folders/fold1');
  });

  it('returns project path without folder', () => {
    mockLocation('/projects/proj1/workflows');
    expect(getNormalizedContextPath()).toBe('/projects/proj1');
  });

  it('returns workflow path', () => {
    mockLocation('/workflow/wf123');
    expect(getNormalizedContextPath()).toBe('/workflow/wf123');
  });

  it('returns pathname when no match', () => {
    mockLocation('/settings');
    expect(getNormalizedContextPath()).toBe('/settings');
  });

  it('handles project path with settings', () => {
    mockLocation('/projects/proj1/settings/members');
    expect(getNormalizedContextPath()).toBe('/projects/proj1');
  });

  it('handles root path', () => {
    mockLocation('/');
    expect(getNormalizedContextPath()).toBe('/');
  });
});

describe('isAuthPage', () => {
  it('detects signin page', () => {
    mockLocation('/signin');
    expect(isAuthPage()).toBe(true);
  });

  it('detects login page', () => {
    mockLocation('/login');
    expect(isAuthPage()).toBe(true);
  });

  it('returns false for non-auth pages', () => {
    mockLocation('/workflows');
    expect(isAuthPage()).toBe(false);
  });

  it('detects signin in nested path', () => {
    mockLocation('/auth/signin');
    expect(isAuthPage()).toBe(true);
  });

  it('returns false for workflow page', () => {
    mockLocation('/workflow/123');
    expect(isAuthPage()).toBe(false);
  });
});

describe('buildWorkflowUrl', () => {
  it('builds workflow URL with origin', () => {
    mockLocation('/projects/abc', 'localhost', 'https://n8n.example.com');
    expect(buildWorkflowUrl('wf123')).toBe('https://n8n.example.com/workflow/wf123');
  });

  it('builds workflow URL with different origin', () => {
    mockLocation('/', 'localhost', 'http://localhost:5678');
    expect(buildWorkflowUrl('abc')).toBe('http://localhost:5678/workflow/abc');
  });

  it('handles numeric workflow ID', () => {
    mockLocation('/', 'localhost', 'https://app.n8n.cloud');
    expect(buildWorkflowUrl('12345')).toBe('https://app.n8n.cloud/workflow/12345');
  });
});

describe('isN8nHost', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns true for n8n.cloud subdomain', () => {
    mockLocation('/workflows', 'test.n8n.cloud', 'https://test.n8n.cloud');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with workflow path', () => {
    mockLocation('/workflow/123', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with workflows path', () => {
    mockLocation('/workflows', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with projects path', () => {
    mockLocation('/projects/abc/workflows', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with credentials path', () => {
    mockLocation('/credentials', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with variables path', () => {
    mockLocation('/variables', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with executions path', () => {
    mockLocation('/executions', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with settings path', () => {
    mockLocation('/settings/users', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for URL with templates path', () => {
    mockLocation('/templates', 'localhost', 'http://localhost');
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for n8n DOM indicators', () => {
    mockLocation('/', 'localhost', 'http://localhost');
    document.body.innerHTML = '<div id="app"><div class="n8n-something"></div></div>';
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for vue-flow indicator', () => {
    mockLocation('/', 'localhost', 'http://localhost');
    document.body.innerHTML = '<div id="app"><div class="vue-flow"></div></div>';
    expect(isN8nHost()).toBe(true);
  });

  it('returns true for workflow data-test-id', () => {
    mockLocation('/', 'localhost', 'http://localhost');
    document.body.innerHTML = '<div id="app"><div data-test-id="workflow-canvas"></div></div>';
    expect(isN8nHost()).toBe(true);
  });

  it('returns false for non-n8n site', () => {
    mockLocation('/', 'example.com', 'https://example.com');
    document.body.innerHTML = '<div>Some other site</div>';
    expect(isN8nHost()).toBe(false);
  });

  it('returns false for non-n8n site without app element', () => {
    mockLocation('/', 'example.com', 'https://example.com');
    document.body.innerHTML = '<div class="n8n-fake"></div>';
    expect(isN8nHost()).toBe(false);
  });
});

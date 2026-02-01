import { describe, expect, it } from 'vitest';
import {
  buildWorkflowUrl,
  getFolderIdFromUrl,
  getNormalizedContextPath,
  getProjectIdFromUrl,
  getWorkflowIdFromUrl,
  isAuthPage,
} from './url';

function mockLocation(pathname: string, hostname = 'localhost', origin = 'http://localhost') {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, hostname, origin },
    writable: true,
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
});

describe('buildWorkflowUrl', () => {
  it('builds workflow URL with origin', () => {
    mockLocation('/projects/abc', 'localhost', 'https://n8n.example.com');
    expect(buildWorkflowUrl('wf123')).toBe('https://n8n.example.com/workflow/wf123');
  });
});

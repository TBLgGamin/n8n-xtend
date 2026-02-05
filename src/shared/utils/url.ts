export function getProjectIdFromUrl(): string | null {
  const match = location.pathname.match(/\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getWorkflowIdFromUrl(): string | null {
  const match = location.pathname.match(/\/workflow\/([^/]+)/);
  return match?.[1] ?? null;
}

function extractPathSegment(pathname: string, prefix: string): string | null {
  const index = pathname.indexOf(prefix);
  if (index === -1) return null;

  const start = index + prefix.length;
  const end = pathname.indexOf('/', start);
  return end === -1 ? pathname.slice(start) : pathname.slice(start, end);
}

export function getNormalizedContextPath(): string {
  const pathname = location.pathname;
  const projectId = extractPathSegment(pathname, '/projects/');

  if (projectId) {
    const folderId = extractPathSegment(pathname, '/folders/');
    return folderId ? `/projects/${projectId}/folders/${folderId}` : `/projects/${projectId}`;
  }

  const workflowId = extractPathSegment(pathname, '/workflow/');
  if (workflowId) {
    return `/workflow/${workflowId}`;
  }

  return pathname;
}

export function getFolderIdFromUrl(): string | null {
  const match = location.pathname.match(/\/folders\/([^/]+)/);
  return match?.[1] ?? null;
}

export function isAuthPage(): boolean {
  return location.pathname.includes('/signin') || location.pathname.includes('/login');
}

export function isWorkflowPage(): boolean {
  return location.pathname.includes('/workflow/');
}

export function isVariablesPage(): boolean {
  return location.pathname.includes('/variables');
}

export function isSettingsPersonalPage(): boolean {
  const path = location.pathname;
  return path === '/settings/personal' || path.startsWith('/settings/personal');
}

function hasN8nDomIndicators(): boolean {
  if (!document.getElementById('app')) {
    return false;
  }

  const primarySelector =
    '[class*="n8n"], [data-test-id^="workflow"], [data-test-id^="node"], .vue-flow, .vue-flow__viewport';
  if (document.querySelector(primarySelector)) {
    return true;
  }

  return Boolean(
    document.querySelector('[class*="sidebar"], [data-test-id="main-sidebar"]') &&
      document.querySelector('[class*="canvas"], [class*="workflow"]'),
  );
}

function hasN8nUrlPatterns(): boolean {
  const n8nPaths = [
    '/workflow/',
    '/workflows',
    '/projects/',
    '/credentials',
    '/variables',
    '/executions',
    '/settings/',
    '/templates',
  ];

  return n8nPaths.some((path) => location.pathname.includes(path));
}

export function isN8nHost(): boolean {
  const hostname = location.hostname;

  if (hostname.endsWith('.n8n.cloud')) {
    return true;
  }

  if (hasN8nUrlPatterns()) {
    return true;
  }

  if (hasN8nDomIndicators()) {
    return true;
  }

  return false;
}

import { isValidId } from './validation';

export function buildWorkflowUrl(workflowId: string): string {
  if (!isValidId(workflowId)) {
    throw new Error(`Invalid workflow ID: ${workflowId}`);
  }
  return `${location.origin}/workflow/${encodeURIComponent(workflowId)}`;
}

export function buildFolderUrl(projectId: string, folderId: string): string {
  if (!isValidId(projectId)) {
    throw new Error(`Invalid project ID: ${projectId}`);
  }
  if (!isValidId(folderId)) {
    throw new Error(`Invalid folder ID: ${folderId}`);
  }
  return `${location.origin}/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/workflows`;
}

export function getProjectIdFromUrl(): string | null {
  const match = location.pathname.match(/\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getWorkflowIdFromUrl(): string | null {
  const match = location.pathname.match(/\/workflow\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getNormalizedContextPath(): string {
  const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
  const workflowMatch = location.pathname.match(/\/workflow\/([^/]+)/);
  const folderMatch = location.pathname.match(/\/folders\/([^/]+)/);

  if (projectMatch) {
    return `/projects/${projectMatch[1]}${folderMatch ? `/folders/${folderMatch[1]}` : ''}`;
  }

  if (workflowMatch) {
    return `/workflow/${workflowMatch[1]}`;
  }

  return location.pathname;
}

export function getFolderIdFromUrl(): string | null {
  const match = location.pathname.match(/\/folders\/([^/]+)/);
  return match?.[1] ?? null;
}

export function isAuthPage(): boolean {
  return location.pathname.includes('/signin') || location.pathname.includes('/login');
}

function hasN8nDomIndicators(): boolean {
  const n8nRoot = document.getElementById('app');
  if (!n8nRoot) {
    return false;
  }

  const hasN8nClasses = document.querySelector(
    '[class*="n8n"], [data-test-id^="workflow"], [data-test-id^="node"]',
  );
  if (hasN8nClasses) {
    return true;
  }

  const hasVueFlow = document.querySelector('.vue-flow, .vue-flow__viewport');
  if (hasVueFlow) {
    return true;
  }

  const hasSidebar = document.querySelector('[class*="sidebar"], [data-test-id="main-sidebar"]');
  const hasCanvas = document.querySelector('[class*="canvas"], [class*="workflow"]');
  if (hasSidebar && hasCanvas) {
    return true;
  }

  return false;
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

export function buildWorkflowUrl(workflowId: string): string {
  return `${location.origin}/workflow/${workflowId}`;
}

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

export function isN8nHost(): boolean {
  const hostname = location.hostname;

  if (hostname.endsWith('.n8n.cloud')) {
    return true;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  return false;
}

export function buildWorkflowUrl(workflowId: string): string {
  return `${location.origin}/workflow/${workflowId}`;
}

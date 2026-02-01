export function getProjectIdFromUrl(): string | null {
  const match = location.pathname.match(/\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getWorkflowIdFromUrl(): string | null {
  const match = location.pathname.match(/\/workflow\/([^/]+)/);
  return match?.[1] ?? null;
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

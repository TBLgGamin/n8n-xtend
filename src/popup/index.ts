import type { MessageRequest, MessageResponse } from '../background/types';
import { logger } from '../shared/utils/logger';
import { getStorageItem, initStorage, setStorageItem } from '../shared/utils/storage';

const log = logger.child('popup');

const GITHUB_REPO = 'TBLgGamin/n8n-xtend';
const ORIGINS_KEY = 'n8n-xtend-popup-origins';

const EXTERNAL_LINK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

function sendMessage(message: MessageRequest): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

function isN8nCloudOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.n8n.cloud');
  } catch {
    return false;
  }
}

function normalizeToOrigin(input: string): string | null {
  const withProtocol = input.includes('://') ? input : `https://${input}`;
  log.debug('Normalizing URL input', { input, withProtocol });
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      log.debug('Rejected: unsupported protocol', url.protocol);
      return null;
    }
    log.debug('Normalized to origin', url.origin);
    return url.origin;
  } catch {
    log.debug('Failed to parse URL', withProtocol);
    return null;
  }
}

function escapeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderOrigins(origins: string[]): void {
  const list = document.getElementById('origins-list');
  if (!list) return;

  if (origins.length === 0) {
    list.innerHTML = '<p class="n8n-xtend-popup-empty">No instances added yet.</p>';
    return;
  }

  list.innerHTML = origins
    .map(
      (origin) =>
        `<div class="n8n-xtend-popup-origin-row">
          <a href="${escapeText(origin)}" target="_blank" rel="noopener noreferrer" class="n8n-xtend-popup-origin-link">
            <span class="n8n-xtend-popup-origin-url">${escapeText(origin)}</span>
            ${EXTERNAL_LINK_ICON}
          </a>
          <button class="n8n-xtend-popup-remove-btn" data-origin="${escapeText(origin)}">&times;</button>
        </div>`,
    )
    .join('');

  for (const btn of list.querySelectorAll<HTMLButtonElement>('.n8n-xtend-popup-remove-btn')) {
    btn.addEventListener('click', async () => {
      const origin = btn.dataset.origin;
      if (!origin) return;
      log.debug('Removing origin', { origin });
      await sendMessage({ type: 'REMOVE_ORIGIN', origin });
      const cached = getStorageItem<string[]>(ORIGINS_KEY) ?? [];
      setStorageItem(
        ORIGINS_KEY,
        cached.filter((o) => o !== origin),
      );
      log.debug('Origin removed from IndexedDB', { origin });
      await loadOrigins();
    });
  }
}

function showError(message: string): void {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function clearError(): void {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

async function loadOrigins(): Promise<void> {
  const cached = getStorageItem<string[]>(ORIGINS_KEY);
  log.debug('IndexedDB cache read', {
    key: ORIGINS_KEY,
    found: cached !== null,
    count: cached?.length ?? 0,
  });
  if (cached) {
    renderOrigins(cached);
  }

  log.debug('Syncing origins from background');
  const response = await sendMessage({ type: 'GET_ORIGINS' });
  if (response.success) {
    log.debug('Background sync complete', { origins: response.origins });
    setStorageItem(ORIGINS_KEY, response.origins);
    renderOrigins(response.origins);
  } else {
    log.debug('Background sync failed');
  }
}

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [lMaj = 0, lMin = 0, lPatch = 0] = parse(latest);
  const [cMaj = 0, cMin = 0, cPatch = 0] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPatch > cPatch;
}

async function checkForUpdate(currentVersion: string): Promise<void> {
  log.debug('Checking for update', { currentVersion });
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) {
      log.debug('GitHub API responded with error', { status: response.status });
      return;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const tagName = typeof data.tag_name === 'string' ? data.tag_name : null;
    if (!tagName) {
      log.debug('No tag_name in GitHub response');
      return;
    }
    const latestVersion = tagName.replace(/^v/, '');
    log.debug('Version comparison', { currentVersion, latestVersion });
    if (!isNewerVersion(latestVersion, currentVersion)) return;
    log.debug('Update available', { latestVersion });
    const badge = document.getElementById('update-badge');
    if (badge) {
      badge.hidden = false;
    }
  } catch {
    log.debug('Update check failed (network error)');
  }
}

function renderVersionFooter(): void {
  const { version } = chrome.runtime.getManifest();
  const footer = document.getElementById('version-footer');
  if (!footer) return;

  const releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${version}`;
  footer.innerHTML = `
    <a href="${escapeText(releaseUrl)}" target="_blank" rel="noopener noreferrer" class="n8n-xtend-popup-version">v${escapeText(version)}</a>
    <span id="update-badge" class="n8n-xtend-popup-update-badge" hidden>Update available</span>
  `;

  checkForUpdate(version);
}

function setupAddButton(): void {
  const addBtn = document.getElementById('add-btn');
  const input = document.getElementById('origin-input') as HTMLInputElement | null;
  if (!addBtn || !input) return;

  addBtn.addEventListener('click', async () => {
    clearError();

    const raw = input.value.trim();
    if (!raw) {
      showError('Please enter a URL.');
      return;
    }

    const origin = normalizeToOrigin(raw);
    if (!origin) {
      showError('Please enter a valid URL (e.g. https://n8n.example.com).');
      return;
    }

    if (isN8nCloudOrigin(origin)) {
      showError('n8n Cloud instances are already supported automatically.');
      return;
    }

    const matchPattern = `${origin}/*`;
    log.debug('Requesting permission', { origin, matchPattern });

    let granted: boolean;
    try {
      granted = await chrome.permissions.request({ origins: [matchPattern] });
    } catch {
      log.debug('chrome.permissions.request threw', { origin });
      showError('Permission request failed. Please try again.');
      return;
    }

    log.debug('Permission request result', { origin, granted });
    if (!granted) {
      showError('Permission was denied. The extension needs access to work on this instance.');
      return;
    }

    const response = await sendMessage({ type: 'ADD_ORIGIN', origin });
    log.debug('ADD_ORIGIN response', { origin, success: response.success });
    if (!response.success) {
      showError(response.error);
      return;
    }

    const cached = getStorageItem<string[]>(ORIGINS_KEY) ?? [];
    setStorageItem(ORIGINS_KEY, [...cached, origin]);
    log.debug('Origin saved to IndexedDB', { origin });
    input.value = '';
    await loadOrigins();
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      addBtn.click();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initStorage();
  await loadOrigins();
  renderVersionFooter();
  setupAddButton();
});

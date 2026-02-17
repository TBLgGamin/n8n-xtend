import type { MessageRequest, MessageResponse } from '../background/types';
import type { ExtensionMetaEntry } from '../extensions/meta';
import { extensionMeta } from '../extensions/meta';
import { getSyncItem, initChromeStorage, setSyncItem } from '../shared/utils/chrome-storage';
import { logger } from '../shared/utils/logger';

const log = logger.child('popup');

const GITHUB_REPO = 'TBLgGamin/n8n-xtend';
const SETTINGS_KEY = 'n8n-xtend-settings';

const CHEVRON_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const EXTERNAL_LINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

type ExtensionSettings = Record<string, boolean>;
type TabId = 'extensions' | 'instances';

let settings: ExtensionSettings = {};
let currentExtension: ExtensionMetaEntry | null = null;

function sendMessage(message: MessageRequest): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

function loadSettings(): void {
  settings = getSyncItem<ExtensionSettings>(SETTINGS_KEY) ?? {};
}

function saveSettings(): void {
  setSyncItem(SETTINGS_KEY, settings);
}

function isEnabled(id: string): boolean {
  const ext = extensionMeta.find((e) => e.id === id);
  return settings[id] ?? ext?.enabledByDefault ?? true;
}

function groupDisplayName(group: string): string {
  const names: Record<string, string> = { sidebar: 'Sidebar', editor: 'Editor', ui: 'UI' };
  return names[group] ?? group;
}

function buildExtensionsByGroup(): Map<string, ExtensionMetaEntry[]> {
  const map = new Map<string, ExtensionMetaEntry[]>();
  for (const ext of extensionMeta) {
    const list = map.get(ext.group) ?? [];
    list.push(ext);
    map.set(ext.group, list);
  }
  return map;
}

function createToggle(id: string, checked: boolean): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'toggle-input';
  input.checked = checked;
  input.dataset.extensionId = id;

  const track = document.createElement('span');
  track.className = 'toggle-track';
  const thumb = document.createElement('span');
  thumb.className = 'toggle-thumb';
  track.appendChild(thumb);

  label.appendChild(input);
  label.appendChild(track);
  return label;
}

function syncDetailToggle(id: string, checked: boolean): void {
  if (currentExtension?.id !== id) return;
  const detailToggle = document.getElementById('detail-toggle') as HTMLInputElement | null;
  if (detailToggle) detailToggle.checked = checked;
}

function syncListToggle(id: string, checked: boolean): void {
  const listToggle = document.querySelector<HTMLInputElement>(
    `.toggle-input[data-extension-id="${id}"]`,
  );
  if (listToggle) listToggle.checked = checked;
}

function renderExtensionGroups(): void {
  const container = document.getElementById('extensions-list');
  if (!container) return;
  container.innerHTML = '';

  for (const [group, extensions] of buildExtensionsByGroup()) {
    const groupEl = document.createElement('div');
    groupEl.className = 'ext-group';

    const labelEl = document.createElement('span');
    labelEl.className = 'ext-group-label';
    labelEl.textContent = groupDisplayName(group);
    groupEl.appendChild(labelEl);

    for (const ext of extensions) {
      const row = document.createElement('div');
      row.className = 'ext-row';

      const info = document.createElement('div');
      info.className = 'ext-row-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'ext-row-name';
      nameEl.textContent = ext.name;

      const descEl = document.createElement('span');
      descEl.className = 'ext-row-desc';
      descEl.textContent = ext.description;

      info.appendChild(nameEl);
      info.appendChild(descEl);

      const actions = document.createElement('div');
      actions.className = 'ext-row-actions';

      const toggle = createToggle(ext.id, isEnabled(ext.id));
      toggle.addEventListener('click', (e) => e.stopPropagation());

      const toggleInput = toggle.querySelector<HTMLInputElement>('.toggle-input');
      toggleInput?.addEventListener('change', () => {
        settings[ext.id] = toggleInput.checked;
        saveSettings();
        syncDetailToggle(ext.id, toggleInput.checked);
      });

      const chevron = document.createElement('span');
      chevron.className = 'ext-row-chevron';
      chevron.innerHTML = CHEVRON_SVG;

      actions.appendChild(toggle);
      actions.appendChild(chevron);

      row.appendChild(info);
      row.appendChild(actions);
      row.addEventListener('click', () => showDetail(ext));

      groupEl.appendChild(row);
    }

    container.appendChild(groupEl);
  }
}

function setupVideoForExtension(ext: ExtensionMetaEntry): void {
  const videoSection = document.getElementById('detail-video');
  const videoEl = document.getElementById('detail-video-el') as HTMLVideoElement | null;
  if (!videoSection || !videoEl) return;

  videoSection.hidden = true;
  videoEl.src = '';

  const videoUrl = chrome.runtime.getURL(`extensions/${ext.group}/${ext.id}/video/${ext.id}.mp4`);

  videoEl.addEventListener(
    'loadedmetadata',
    () => {
      videoSection.hidden = false;
    },
    { once: true },
  );

  videoEl.addEventListener(
    'error',
    () => {
      videoSection.hidden = true;
    },
    { once: true },
  );

  videoEl.src = videoUrl;
  videoEl.load();
}

function showDetail(ext: ExtensionMetaEntry): void {
  currentExtension = ext;

  const listPanel = document.getElementById('panel-extensions');
  const detailPanel = document.getElementById('panel-extensions-detail');
  if (listPanel) listPanel.classList.add('popup-panel--hidden');
  if (detailPanel) detailPanel.classList.remove('popup-panel--hidden');

  const nameEl = document.getElementById('detail-name');
  const groupBadge = document.getElementById('detail-group-badge');
  const descEl = document.getElementById('detail-description');
  const howToEl = document.getElementById('detail-how-to-use');
  const toggleEl = document.getElementById('detail-toggle') as HTMLInputElement | null;
  const reloadHint = document.getElementById('detail-reload-hint');

  if (nameEl) nameEl.textContent = ext.name;
  if (groupBadge) groupBadge.textContent = groupDisplayName(ext.group);
  if (descEl) descEl.textContent = ext.description;
  if (howToEl) howToEl.textContent = ext.howToUse;
  if (toggleEl) toggleEl.checked = isEnabled(ext.id);
  if (reloadHint) reloadHint.hidden = true;

  setupVideoForExtension(ext);
}

function showList(): void {
  currentExtension = null;

  const listPanel = document.getElementById('panel-extensions');
  const detailPanel = document.getElementById('panel-extensions-detail');
  if (listPanel) listPanel.classList.remove('popup-panel--hidden');
  if (detailPanel) detailPanel.classList.add('popup-panel--hidden');

  renderExtensionGroups();
}

function showTab(tabId: TabId): void {
  if (tabId === 'extensions') {
    showList();
  }

  for (const tab of document.querySelectorAll<HTMLButtonElement>('.popup-tab')) {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('popup-tab--active', isActive);
  }

  const allPanels = ['panel-extensions', 'panel-extensions-detail', 'panel-instances'];
  for (const panelId of allPanels) {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('popup-panel--hidden');
  }

  if (tabId === 'extensions') {
    const listPanel = document.getElementById('panel-extensions');
    if (listPanel) listPanel.classList.remove('popup-panel--hidden');
  } else if (tabId === 'instances') {
    const instancesPanel = document.getElementById('panel-instances');
    if (instancesPanel) instancesPanel.classList.remove('popup-panel--hidden');
  }
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
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function renderOrigins(origins: string[]): void {
  const list = document.getElementById('origins-list');
  if (!list) return;
  list.innerHTML = '';

  if (origins.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'origins-empty';
    empty.textContent = 'No instances added yet.';
    list.appendChild(empty);
    return;
  }

  for (const origin of origins) {
    const row = document.createElement('div');
    row.className = 'origin-row';

    const link = document.createElement('a');
    link.className = 'origin-link';
    link.href = origin;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const urlSpan = document.createElement('span');
    urlSpan.className = 'origin-url';
    urlSpan.textContent = origin;

    link.appendChild(urlSpan);
    link.insertAdjacentHTML('beforeend', EXTERNAL_LINK_SVG);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'origin-remove-btn';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', async () => {
      await sendMessage({ type: 'REMOVE_ORIGIN', origin });
      await loadOrigins();
    });

    row.appendChild(link);
    row.appendChild(removeBtn);
    list.appendChild(row);
  }
}

function showOriginError(message: string): void {
  const el = document.getElementById('origin-error');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function clearOriginError(): void {
  const el = document.getElementById('origin-error');
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

async function loadOrigins(): Promise<void> {
  const response = await sendMessage({ type: 'GET_ORIGINS' });
  if (response.success) {
    renderOrigins(response.origins);
  }
}

function setupTabs(): void {
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.popup-tab')) {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab as TabId | undefined;
      if (tabId) showTab(tabId);
    });
  }
}

function setupDetailToggle(): void {
  const toggleEl = document.getElementById('detail-toggle') as HTMLInputElement | null;
  const reloadHint = document.getElementById('detail-reload-hint');
  if (!toggleEl) return;

  toggleEl.addEventListener('change', () => {
    if (!currentExtension) return;
    settings[currentExtension.id] = toggleEl.checked;
    saveSettings();
    syncListToggle(currentExtension.id, toggleEl.checked);
    if (reloadHint) reloadHint.hidden = false;
  });
}

function setupDetailBackButton(): void {
  const btn = document.getElementById('detail-back-btn');
  if (!btn) return;
  btn.addEventListener('click', showList);
}

function setupDetailFullscreenButton(): void {
  const btn = document.getElementById('detail-fullscreen-btn');
  const videoEl = document.getElementById('detail-video-el') as HTMLVideoElement | null;
  if (!btn || !videoEl) return;

  btn.addEventListener('click', () => {
    void videoEl.requestFullscreen();
  });
}

function setupAddOrigin(): void {
  const addBtn = document.getElementById('origin-add-btn');
  const input = document.getElementById('origin-input') as HTMLInputElement | null;
  if (!addBtn || !input) return;

  addBtn.addEventListener('click', async () => {
    clearOriginError();

    const raw = input.value.trim();
    if (!raw) {
      showOriginError('Please enter a URL.');
      return;
    }

    const origin = normalizeToOrigin(raw);
    if (!origin) {
      showOriginError('Please enter a valid URL (e.g. https://n8n.example.com).');
      return;
    }

    if (isN8nCloudOrigin(origin)) {
      showOriginError('n8n Cloud instances are already supported automatically.');
      return;
    }

    let granted: boolean;
    try {
      granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    } catch {
      showOriginError('Permission request failed. Please try again.');
      return;
    }

    if (!granted) {
      showOriginError(
        'Permission was denied. The extension needs access to work on this instance.',
      );
      return;
    }

    const response = await sendMessage({ type: 'ADD_ORIGIN', origin });
    if (!response.success) {
      showOriginError(response.error ?? 'Failed to add instance.');
      return;
    }

    input.value = '';
    await loadOrigins();
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') addBtn.click();
  });
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
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) return;
    const data = (await response.json()) as Record<string, unknown>;
    const tagName = typeof data.tag_name === 'string' ? data.tag_name : null;
    if (!tagName) return;
    const latestVersion = tagName.replace(/^v/, '');
    if (!isNewerVersion(latestVersion, currentVersion)) return;
    const badge = document.getElementById('update-badge');
    if (badge) badge.hidden = false;
  } catch {
    log.debug('Update check failed');
  }
}

function renderVersionInfo(): void {
  const { version } = chrome.runtime.getManifest();
  const versionLink = document.getElementById('version-link') as HTMLAnchorElement | null;
  if (versionLink) {
    versionLink.href = `https://github.com/${GITHUB_REPO}/releases/tag/v${version}`;
    versionLink.textContent = `v${version}`;
  }
  void checkForUpdate(version);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initChromeStorage();
  loadSettings();

  renderExtensionGroups();
  renderVersionInfo();

  setupTabs();
  setupDetailBackButton();
  setupDetailToggle();
  setupDetailFullscreenButton();
  setupAddOrigin();

  await loadOrigins();
});

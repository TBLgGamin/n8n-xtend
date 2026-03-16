import type { MessageRequest, MessageResponse } from '../background/types';
import type { ExtensionMetaEntry } from '../extensions/meta';
import { extensionMeta } from '../extensions/meta';
import {
  getLocalItem,
  getSyncItem,
  initChromeStorage,
  setSyncItem,
} from '../shared/utils/chrome-storage';
import { logger } from '../shared/utils/logger';
import { THEME_STORAGE_KEY } from '../shared/utils/theme-manager';

const log = logger.child('popup');

const GITHUB_REPO = 'TBLgGamin/n8n-xtend';
const SETTINGS_KEY = 'n8n-xtend-settings';
const PREFERENCES_KEY = 'n8n-xtend-preferences';

const TRASH_ICON_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

type ExtensionSettings = Record<string, boolean>;

interface Preferences {
  checkForUpdates: boolean;
}

const defaultPreferences: Preferences = { checkForUpdates: true };

let settings: ExtensionSettings = {};
let preferences: Preferences = { ...defaultPreferences };
let searchQuery = '';

function sendMessage(message: MessageRequest): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

function loadSettings(): void {
  settings = getSyncItem<ExtensionSettings>(SETTINGS_KEY) ?? {};
}

function saveSettings(): void {
  setSyncItem(SETTINGS_KEY, settings);
}

function loadPreferences(): void {
  preferences = getSyncItem<Preferences>(PREFERENCES_KEY) ?? {
    ...defaultPreferences,
  };
}

function savePreferences(): void {
  setSyncItem(PREFERENCES_KEY, preferences);
}

const extensionDefaultsMap = new Map(extensionMeta.map((e) => [e.id, e.enabledByDefault]));

function isEnabled(id: string): boolean {
  return settings[id] ?? extensionDefaultsMap.get(id) ?? true;
}

function showReloadBanner(): void {
  const banner = document.getElementById('reload-banner');
  if (banner) banner.hidden = false;
}

function groupDisplayName(group: string): string {
  const names: Record<string, string> = {
    sidebar: 'Sidebar',
    editor: 'Editor',
    ui: 'UI',
  };
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

let activeViewId = 'extensions';

function showView(viewId: string): void {
  for (const view of document.querySelectorAll<HTMLElement>('.popup-view')) {
    view.classList.add('popup-view--hidden');
  }
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.remove('popup-view--hidden');

  activeViewId = viewId;

  const isMain = viewId === 'extensions';
  const sep = document.getElementById('header-sep');
  const page = document.getElementById('header-page');
  const parent = document.getElementById('header-parent');
  const sep2 = document.getElementById('header-sep-2');

  if (sep) sep.hidden = isMain;
  if (page) page.hidden = isMain;

  const hasParent = viewId === 'instances';
  if (parent) parent.hidden = !hasParent;
  if (sep2) sep2.hidden = !hasParent;
}

function setupVideo(ext: ExtensionMetaEntry): void {
  const wrap = document.getElementById('detail-video-wrap');
  const video = document.getElementById('detail-video') as HTMLVideoElement | null;
  if (!wrap || !video) return;

  wrap.hidden = true;
  video.src = '';

  const url = chrome.runtime.getURL(`extensions/${ext.group}/${ext.id}/video/${ext.id}.mp4`);

  video.addEventListener(
    'loadedmetadata',
    () => {
      wrap.hidden = false;
    },
    { once: true },
  );
  video.addEventListener(
    'error',
    () => {
      wrap.hidden = true;
    },
    { once: true },
  );

  video.src = url;
  video.load();
}

function showExtensionDetail(ext: ExtensionMetaEntry): void {
  const pageEl = document.getElementById('header-page');
  const nameEl = document.getElementById('detail-name');
  const desc = document.getElementById('detail-desc');
  const howTo = document.getElementById('detail-how-to-use');

  if (pageEl) pageEl.textContent = ext.name;
  if (nameEl) nameEl.textContent = ext.name;
  if (desc) desc.textContent = ext.description;
  if (howTo) howTo.textContent = ext.howToUse;

  setupVideo(ext);
  showView('detail');
}

function showExtensionsList(): void {
  renderExtensions();
  showView('extensions');
}

function showSettings(): void {
  const pageEl = document.getElementById('header-page');
  if (pageEl) pageEl.textContent = 'Settings';
  showView('settings');
}

function showInstances(): void {
  const pageEl = document.getElementById('header-page');
  const parentEl = document.getElementById('header-parent');
  if (pageEl) pageEl.textContent = 'Instances';
  if (parentEl) parentEl.textContent = 'Settings';
  showView('instances');
  void loadOrigins();
}

function setGroupEnabled(extensions: ExtensionMetaEntry[], enabled: boolean): void {
  for (const ext of extensions) {
    settings[ext.id] = enabled;
  }
  saveSettings();
  showReloadBanner();
  renderExtensions();
}

function matchesSearch(ext: ExtensionMetaEntry): boolean {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return ext.name.toLowerCase().includes(q) || ext.description.toLowerCase().includes(q);
}

const SEARCH_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;

function ensureSearchBar(container: HTMLElement): void {
  if (container.querySelector('.ext-search-wrap')) return;
  const search = document.createElement('div');
  search.className = 'ext-search-wrap';
  const icon = document.createElement('span');
  icon.className = 'ext-search-icon';
  icon.innerHTML = SEARCH_ICON_SVG;
  search.appendChild(icon);
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'ext-search';
  searchInput.placeholder = 'Search\u2026';
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderExtensionRows();
  });
  search.appendChild(searchInput);
  container.prepend(search);
}

function renderExtensionRows(): void {
  const container = document.getElementById('view-extensions');
  if (!container) return;

  const existing = container.querySelectorAll('.ext-group');
  for (const el of existing) el.remove();

  let focusableIndex = 0;

  for (const [group, extensions] of buildExtensionsByGroup()) {
    const filtered = extensions.filter(matchesSearch);
    if (filtered.length === 0) continue;

    const groupEl = document.createElement('div');
    groupEl.className = 'ext-group';

    const header = document.createElement('div');
    header.className = 'ext-group-header';

    const label = document.createElement('span');
    label.className = 'ext-group-label';
    label.textContent = `${groupDisplayName(group)} (${filtered.length})`;

    const allEnabled = filtered.every((e) => isEnabled(e.id));
    const toggleAllBtn = document.createElement('button');
    toggleAllBtn.className = 'ext-group-toggle';
    toggleAllBtn.textContent = allEnabled ? 'Disable all' : 'Enable all';
    toggleAllBtn.addEventListener('click', () => {
      setGroupEnabled(filtered, !allEnabled);
    });

    header.appendChild(label);
    header.appendChild(toggleAllBtn);
    groupEl.appendChild(header);

    for (const ext of filtered) {
      const row = document.createElement('div');
      row.className = 'ext-row';
      row.tabIndex = 0;
      row.dataset.focusIndex = String(focusableIndex++);

      const info = document.createElement('div');
      info.className = 'ext-row-info';

      const name = document.createElement('span');
      name.className = 'ext-row-name';
      name.textContent = ext.name;

      const desc = document.createElement('span');
      desc.className = 'ext-row-desc';
      desc.textContent = ext.description;

      info.appendChild(name);
      info.appendChild(desc);

      const toggle = createToggle(ext.id, isEnabled(ext.id));
      toggle.addEventListener('click', (e) => e.stopPropagation());

      const toggleInput = toggle.querySelector<HTMLInputElement>('.toggle-input');
      toggleInput?.addEventListener('change', () => {
        settings[ext.id] = toggleInput.checked;
        saveSettings();
        showReloadBanner();
        log.debug('Extension toggled', { id: ext.id, enabled: toggleInput.checked });
      });

      row.appendChild(info);
      row.appendChild(toggle);
      row.addEventListener('click', () => showExtensionDetail(ext));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') showExtensionDetail(ext);
      });

      groupEl.appendChild(row);
    }

    container.appendChild(groupEl);
  }
}

function renderExtensions(): void {
  const container = document.getElementById('view-extensions');
  if (!container) return;
  ensureSearchBar(container);
  renderExtensionRows();
}

function handleEscapeKey(): boolean {
  if (activeViewId === 'detail') {
    showExtensionsList();
    return true;
  }
  if (activeViewId === 'instances') {
    showSettings();
    return true;
  }
  if (activeViewId === 'settings') {
    showExtensionsList();
    return true;
  }
  return false;
}

function handleArrowNavigation(e: KeyboardEvent): void {
  if (activeViewId !== 'extensions') return;
  if (e.target instanceof HTMLInputElement) return;

  const rows = Array.from(document.querySelectorAll<HTMLElement>('.ext-row[tabindex]'));
  if (rows.length === 0) return;
  const currentIndex = rows.indexOf(document.activeElement as HTMLElement);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    rows[currentIndex < rows.length - 1 ? currentIndex + 1 : 0]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    rows[currentIndex > 0 ? currentIndex - 1 : rows.length - 1]?.focus();
  }
}

function setupKeyboardNavigation(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && handleEscapeKey()) return;
    handleArrowNavigation(e);
  });
}

function isN8nCloudOrigin(origin: string): boolean {
  try {
    return new URL(origin).hostname.endsWith('.n8n.cloud');
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

function renderOriginsList(origins: string[]): void {
  const table = document.getElementById('instances-list');
  const tbody = document.getElementById('instances-tbody');
  if (!table || !tbody) return;

  tbody.innerHTML = '';

  if (origins.length === 0) {
    table.hidden = true;
    return;
  }

  table.hidden = false;

  for (const origin of origins) {
    const tr = document.createElement('tr');
    tr.className = 'instances-tr';

    const tdInfo = document.createElement('td');
    tdInfo.className = 'instances-td-info';
    const link = document.createElement('a');
    link.href = origin;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'instances-td-link';

    const host = document.createElement('span');
    host.className = 'instances-td-host';
    host.textContent = new URL(origin).hostname;

    const originText = document.createElement('span');
    originText.className = 'instances-td-origin';
    originText.textContent = origin;

    link.appendChild(host);
    link.appendChild(originText);
    tdInfo.appendChild(link);

    const tdAction = document.createElement('td');
    tdAction.className = 'instances-td-action';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'instances-item-remove';
    removeBtn.innerHTML = TRASH_ICON_SVG;
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.addEventListener('click', async () => {
      log.debug('Origin removed', { origin });
      await sendMessage({ type: 'REMOVE_ORIGIN', origin });
      await loadOrigins();
    });
    tdAction.appendChild(removeBtn);

    tr.appendChild(tdInfo);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
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
    renderOriginsList(response.origins);
  }
}

function setupHomeButton(): void {
  document.getElementById('header-home')?.addEventListener('click', showExtensionsList);
  document.getElementById('header-parent')?.addEventListener('click', showSettings);
}

function setupSettingsButton(): void {
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    const settingsView = document.getElementById('view-settings');
    const instancesView = document.getElementById('view-instances');
    const onSettings = settingsView && !settingsView.classList.contains('popup-view--hidden');
    const onInstances = instancesView && !instancesView.classList.contains('popup-view--hidden');
    if (onSettings || onInstances) {
      showExtensionsList();
    } else {
      showSettings();
    }
  });
}

function setupInstancesNavigation(): void {
  document.getElementById('go-instances')?.addEventListener('click', showInstances);
}

const PENDING_ORIGIN_KEY = 'n8n-xtend-pending-origin';

async function finishAddOrigin(origin: string): Promise<void> {
  const hasPermission = await chrome.permissions.contains({ origins: [`${origin}/*`] });
  if (!hasPermission) return;

  localStorage.removeItem(PENDING_ORIGIN_KEY);
  const response = await sendMessage({ type: 'ADD_ORIGIN', origin });
  if (response.success) {
    log.debug('Origin added', { origin });
    await loadOrigins();
  }
}

async function resumePendingOrigin(): Promise<void> {
  const pending = localStorage.getItem(PENDING_ORIGIN_KEY);
  if (!pending) return;
  await finishAddOrigin(pending);
}

function setupAddOrigin(): void {
  const addBtn = document.getElementById('origin-add');
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
      showOriginError('n8n Cloud instances are supported automatically.');
      return;
    }

    localStorage.setItem(PENDING_ORIGIN_KEY, origin);

    let granted: boolean;
    try {
      granted = await chrome.permissions.request({
        origins: [`${origin}/*`],
      });
    } catch {
      localStorage.removeItem(PENDING_ORIGIN_KEY);
      showOriginError('Permission request failed. Please try again.');
      return;
    }

    if (!granted) {
      localStorage.removeItem(PENDING_ORIGIN_KEY);
      showOriginError(
        'Permission was denied. The extension needs access to work on this instance.',
      );
      return;
    }

    await finishAddOrigin(origin);
    input.value = '';
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') addBtn.click();
  });
}

function setupPreferences(): void {
  const updateToggle = document.getElementById('pref-check-updates') as HTMLInputElement | null;
  if (updateToggle) {
    updateToggle.checked = preferences.checkForUpdates;
    updateToggle.addEventListener('change', () => {
      preferences.checkForUpdates = updateToggle.checked;
      savePreferences();
    });
  }

  const resetBtn = document.getElementById('reset-settings');
  resetBtn?.addEventListener('click', () => {
    log.debug('Settings reset');
    settings = {};
    saveSettings();
    renderExtensions();
    showReloadBanner();

    resetBtn.textContent = 'Done';
    setTimeout(() => {
      resetBtn.textContent = 'Reset';
    }, 1500);
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
    if (!tagName || !/^v?\d+\.\d+\.\d+$/.test(tagName)) return;
    const latestVersion = tagName.replace(/^v/, '');
    if (!isNewerVersion(latestVersion, currentVersion)) return;

    const safeTag = encodeURIComponent(tagName);
    const updateLink = document.getElementById('settings-update-link') as HTMLAnchorElement | null;
    if (updateLink) {
      updateLink.href = `https://github.com/${GITHUB_REPO}/releases/tag/${safeTag}`;
      updateLink.textContent = `v${latestVersion} available \u2014 Download`;
      updateLink.hidden = false;
    }
  } catch {
    log.debug('Update check failed');
  }
}

function renderVersion(): void {
  const { version } = chrome.runtime.getManifest();

  const versionText = document.getElementById('settings-version-text');
  if (versionText) {
    versionText.textContent = `n8n-xtend v${version}`;
  }

  if (preferences.checkForUpdates) {
    void checkForUpdate(version);
  }
}

function applyDarkMode(dark: boolean): void {
  log.debug('Applying dark mode', { dark });
  document.documentElement.classList.toggle('n8n-xtend-dark', dark);
}

function setupDarkMode(): void {
  const storedTheme = getLocalItem<string>(THEME_STORAGE_KEY);
  log.debug('Stored theme from content script', { storedTheme });

  if (storedTheme === 'dark' || storedTheme === 'light') {
    applyDarkMode(storedTheme === 'dark');
  } else {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    log.debug('No stored theme, falling back to system preference', { dark: mq.matches });
    applyDarkMode(mq.matches);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[THEME_STORAGE_KEY]) {
      const newTheme = changes[THEME_STORAGE_KEY].newValue as string | undefined;
      log.debug('Theme storage changed', { newTheme });
      if (newTheme === 'dark' || newTheme === 'light') {
        applyDarkMode(newTheme === 'dark');
      }
    }
  });

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    const storedNow = getLocalItem<string>(THEME_STORAGE_KEY);
    if (!storedNow) {
      log.debug('System preference changed, no stored theme', { dark: e.matches });
      applyDarkMode(e.matches);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initChromeStorage();
  setupDarkMode();
  loadSettings();
  loadPreferences();

  renderExtensions();
  renderVersion();

  setupHomeButton();
  setupSettingsButton();
  setupAddOrigin();
  setupPreferences();
  setupInstancesNavigation();
  setupKeyboardNavigation();

  await loadOrigins();
  await resumePendingOrigin();
});

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

const ROW_CHEVRON_SVG = `<svg class="ext-row-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const INSTANCE_ICON_SVG = `<svg class="instances-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20"/></svg>`;
const TRASH_ICON_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

type ExtensionSettings = Record<string, boolean>;

interface Preferences {
  checkForUpdates: boolean;
}

const defaultPreferences: Preferences = { checkForUpdates: true };

let settings: ExtensionSettings = {};
let preferences: Preferences = { ...defaultPreferences };
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

function loadPreferences(): void {
  preferences = getSyncItem<Preferences>(PREFERENCES_KEY) ?? {
    ...defaultPreferences,
  };
}

function savePreferences(): void {
  setSyncItem(PREFERENCES_KEY, preferences);
}

function isEnabled(id: string): boolean {
  const ext = extensionMeta.find((e) => e.id === id);
  return settings[id] ?? ext?.enabledByDefault ?? true;
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

function showView(viewId: string): void {
  for (const view of document.querySelectorAll<HTMLElement>('.popup-view')) {
    view.classList.add('popup-view--hidden');
  }
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.remove('popup-view--hidden');

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

function syncListToggle(id: string, checked: boolean): void {
  const el = document.querySelector<HTMLInputElement>(`.toggle-input[data-extension-id="${id}"]`);
  if (el) el.checked = checked;
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
  currentExtension = ext;

  const pageEl = document.getElementById('header-page');
  const nameEl = document.getElementById('detail-name');
  const desc = document.getElementById('detail-desc');
  const howTo = document.getElementById('detail-how-to-use');
  const toggle = document.getElementById('detail-toggle') as HTMLInputElement | null;
  const hint = document.getElementById('detail-hint');

  if (pageEl) pageEl.textContent = ext.name;
  if (nameEl) nameEl.textContent = ext.name;
  if (desc) desc.textContent = ext.description;
  if (howTo) howTo.textContent = ext.howToUse;
  if (toggle) toggle.checked = isEnabled(ext.id);
  if (hint) hint.hidden = true;

  setupVideo(ext);
  showView('detail');
}

function showExtensionsList(): void {
  currentExtension = null;
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

function renderExtensions(): void {
  const container = document.getElementById('view-extensions');
  if (!container) return;
  container.innerHTML = '';

  for (const [group, extensions] of buildExtensionsByGroup()) {
    const groupEl = document.createElement('div');
    groupEl.className = 'ext-group';

    const label = document.createElement('span');
    label.className = 'ext-group-label';
    label.textContent = groupDisplayName(group);
    groupEl.appendChild(label);

    for (const ext of extensions) {
      const row = document.createElement('div');
      row.className = 'ext-row';

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
      });

      row.appendChild(info);
      row.appendChild(toggle);
      row.insertAdjacentHTML('beforeend', ROW_CHEVRON_SVG);
      row.addEventListener('click', () => showExtensionDetail(ext));

      groupEl.appendChild(row);
    }

    container.appendChild(groupEl);
  }
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
  const list = document.getElementById('instances-list');
  if (!list) return;

  list.innerHTML = '';

  if (origins.length === 0) {
    list.hidden = true;
    return;
  }

  list.hidden = false;

  for (const origin of origins) {
    const li = document.createElement('li');
    li.className = 'instances-item';

    const link = document.createElement('a');
    link.className = 'instances-item-link';
    link.href = origin;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const info = document.createElement('div');
    info.className = 'instances-item-info';

    const host = document.createElement('span');
    host.className = 'instances-item-host';
    host.textContent = new URL(origin).hostname;

    const originText = document.createElement('span');
    originText.className = 'instances-item-origin';
    originText.textContent = origin;

    info.appendChild(host);
    info.appendChild(originText);
    link.appendChild(info);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'instances-item-remove';
    removeBtn.innerHTML = TRASH_ICON_SVG;
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.addEventListener('click', async () => {
      await sendMessage({ type: 'REMOVE_ORIGIN', origin });
      await loadOrigins();
    });

    li.insertAdjacentHTML('afterbegin', INSTANCE_ICON_SVG);
    li.appendChild(link);
    li.appendChild(removeBtn);
    list.appendChild(li);
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

function setupDetailToggle(): void {
  const toggle = document.getElementById('detail-toggle') as HTMLInputElement | null;
  const hint = document.getElementById('detail-hint');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    if (!currentExtension) return;
    settings[currentExtension.id] = toggle.checked;
    saveSettings();
    syncListToggle(currentExtension.id, toggle.checked);
    showReloadBanner();
    if (hint) hint.hidden = false;
  });
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

    let granted: boolean;
    try {
      granted = await chrome.permissions.request({
        origins: [`${origin}/*`],
      });
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
    if (!tagName) return;
    const latestVersion = tagName.replace(/^v/, '');
    if (!isNewerVersion(latestVersion, currentVersion)) return;

    const badge = document.getElementById('update-badge') as HTMLAnchorElement | null;
    if (badge) {
      badge.href = `https://github.com/${GITHUB_REPO}/releases/tag/${tagName}`;
      badge.hidden = false;
    }

    const updateLink = document.getElementById('settings-update-link') as HTMLAnchorElement | null;
    if (updateLink) {
      updateLink.href = `https://github.com/${GITHUB_REPO}/releases/tag/${tagName}`;
      updateLink.textContent = `Update available \u2014 Download v${latestVersion}`;
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
  setupDetailToggle();
  setupAddOrigin();
  setupPreferences();
  setupInstancesNavigation();

  await loadOrigins();
});

import { extensionRegistry } from '@/extensions/registry';
import type { ExtensionEntry } from '@/extensions/types';
import { escapeHtml, logger } from '@/shared/utils';
import { getExtensionSettings, setExtensionEnabled } from './storage';

const log = logger.child('settings');

const CONTAINER_ID = 'n8n-xtend-settings';
const MARKER_ATTR = 'data-n8n-xtend-settings';

const GROUP_DISPLAY_NAMES: Record<string, string> = {
  sidebar: 'Sidebar',
  editor: 'Editor',
  ui: 'UI',
};

function getGroupDisplayName(group: string): string {
  return GROUP_DISPLAY_NAMES[group] ?? group;
}

function getUniqueGroups(extensions: ExtensionEntry[]): string[] {
  return [...new Set(extensions.map((ext) => ext.group))];
}

function createToggle(id: string, checked: boolean): string {
  return `
    <label class="n8n-xtend-toggle">
      <input type="checkbox" ${checked ? 'checked' : ''} data-extension-id="${escapeHtml(id)}" />
      <span class="n8n-xtend-toggle-slider"></span>
    </label>
  `;
}

function createExtensionRow(
  id: string,
  name: string,
  description: string,
  enabled: boolean,
): string {
  return `
    <div class="n8n-xtend-extension-row" data-extension="${escapeHtml(id)}">
      <div class="n8n-xtend-extension-info">
        <div class="n8n-xtend-extension-name">${escapeHtml(name)}</div>
        <div class="n8n-xtend-extension-description">${escapeHtml(description)}</div>
      </div>
      ${createToggle(id, enabled)}
    </div>
  `;
}

function createExtensionGroup(groupName: string, extensionRows: string): string {
  return `
    <div class="n8n-xtend-extension-group">
      <div class="n8n-xtend-extension-group-name">${escapeHtml(groupName)}</div>
      ${extensionRows}
    </div>
  `;
}

function createGroupedExtensionRows(settings: Record<string, boolean>): string {
  const groups = getUniqueGroups(extensionRegistry);
  log.debug(
    'Creating grouped rows, groups:',
    groups.length,
    'extensions:',
    extensionRegistry.length,
  );

  return groups
    .map((group) => {
      const groupExtensions = extensionRegistry.filter((ext) => ext.group === group);
      const displayName = getGroupDisplayName(group);
      log.debug(`Group "${displayName}" (${group}): ${groupExtensions.length} extensions`);

      const rows = groupExtensions
        .map((ext) =>
          createExtensionRow(
            ext.id,
            ext.name,
            ext.description,
            settings[ext.id] ?? ext.enabledByDefault,
          ),
        )
        .join('');

      return createExtensionGroup(displayName, rows);
    })
    .join('');
}

function createSettingsPanel(): HTMLElement {
  const settings = getExtensionSettings();
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  const logoUrl = chrome.runtime.getURL('icons/icon-48.png');

  container.innerHTML = `
    <div class="n8n-xtend-settings-header">
      <div class="n8n-xtend-settings-title-row">
        <img src="${logoUrl}" alt="n8n-xtend" class="n8n-xtend-logo" />
        <span class="n8n-text _size-medium_1c4va_141 _bold_1c4va_123">n8n-xtend</span>
      </div>
      <span class="n8n-xtend-reload-hint">Reload to apply</span>
    </div>
    <div class="n8n-xtend-extensions-list">
      ${createGroupedExtensionRows(settings)}
    </div>
  `;

  return container;
}

function attachEventListeners(container: HTMLElement): void {
  const toggles = container.querySelectorAll<HTMLInputElement>('input[data-extension-id]');

  for (const toggle of toggles) {
    toggle.addEventListener('change', () => {
      const extensionId = toggle.dataset.extensionId;
      if (extensionId) {
        setExtensionEnabled(extensionId, toggle.checked);
        showReloadHint(container);
      }
    });
  }
}

function showReloadHint(container: HTMLElement): void {
  const hint = container.querySelector('.n8n-xtend-reload-hint');
  if (hint) {
    hint.classList.add('visible');
  }
}

function findInjectionPoint(): Element | null {
  log.debug('Searching for injection point');

  const themeSelect = document.querySelector('[data-test-id="theme-select"]');
  log.debug('Theme select found:', !!themeSelect);
  if (themeSelect) {
    const inputLabel = themeSelect.closest('[data-test-id="input-label"]');
    log.debug('Input label found:', !!inputLabel, 'parent:', !!inputLabel?.parentElement);
    if (inputLabel?.parentElement) {
      log.debug('Found injection point: after theme select container');
      return inputLabel.parentElement;
    }
  }

  const headings = document.querySelectorAll('.n8n-heading');
  log.debug('Headings found:', headings.length);
  for (const heading of headings) {
    log.debug('Heading text:', heading.textContent?.trim());
    if (heading.textContent?.trim() === 'Personalisation') {
      const container = heading.closest('div.mb-s')?.parentElement;
      if (container) {
        log.debug('Found injection point: Personalisation section');
        return container;
      }
    }
  }

  log.debug('No injection point found');
  return null;
}

export function injectSettingsPanel(): boolean {
  log.debug('injectSettingsPanel called');

  if (document.getElementById(CONTAINER_ID)) {
    log.debug('Container already exists, skipping');
    return true;
  }

  const injectionPoint = findInjectionPoint();
  log.debug('Injection point found:', !!injectionPoint);
  if (!injectionPoint) {
    return false;
  }

  if (injectionPoint.hasAttribute(MARKER_ATTR)) {
    log.debug('Marker attribute already set, skipping');
    return true;
  }

  log.debug('Creating settings panel');
  const container = createSettingsPanel();
  log.debug('Panel created, innerHTML length:', container.innerHTML.length);

  injectionPoint.setAttribute(MARKER_ATTR, 'true');
  injectionPoint.appendChild(container);

  attachEventListeners(container);

  log.debug('Settings panel injected successfully');
  return true;
}

export function removeSettingsPanel(): void {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.remove();
  }

  const marked = document.querySelector(`[${MARKER_ATTR}]`);
  if (marked) {
    marked.removeAttribute(MARKER_ATTR);
  }
}

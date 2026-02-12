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

function buildExtensionsByGroup(): Map<string, ExtensionEntry[]> {
  const grouped = new Map<string, ExtensionEntry[]>();
  for (const ext of extensionRegistry) {
    const existing = grouped.get(ext.group);
    if (existing) {
      existing.push(ext);
    } else {
      grouped.set(ext.group, [ext]);
    }
  }
  return grouped;
}

function createCheckbox(id: string, checked: boolean): string {
  return `<input type="checkbox" class="n8n-xtend-checkbox" ${checked ? 'checked' : ''} data-extension-id="${escapeHtml(id)}" />`;
}

function createExtensionRow(
  id: string,
  name: string,
  description: string,
  enabled: boolean,
): string {
  return `
    <div class="n8n-xtend-extension-row" data-extension="${escapeHtml(id)}">
      ${createCheckbox(id, enabled)}
      <div class="n8n-xtend-extension-info">
        <span class="n8n-xtend-extension-name">${escapeHtml(name)}</span>
        <span class="n8n-xtend-extension-description">${escapeHtml(description)}</span>
      </div>
    </div>
  `;
}

function createSettingsPanel(): HTMLElement {
  const settings = getExtensionSettings();
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  const groups = getUniqueGroups(extensionRegistry);
  const extensionsByGroup = buildExtensionsByGroup();

  let groupsHtml = '';
  for (const group of groups) {
    const groupExtensions = extensionsByGroup.get(group) ?? [];
    const displayName = getGroupDisplayName(group);

    const rowsHtml = groupExtensions
      .map((ext) =>
        createExtensionRow(
          ext.id,
          ext.name,
          ext.description,
          settings[ext.id] ?? ext.enabledByDefault,
        ),
      )
      .join('');

    groupsHtml += `
      <div class="n8n-xtend-extension-group">
        <div class="n8n-xtend-group-label">${escapeHtml(displayName)}</div>
        ${rowsHtml}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="n8n-xtend-settings-header">
      <div class="n8n-xtend-settings-title">
        <span class="n8n-xtend-heading">Extensions</span>
      </div>
      <span class="n8n-xtend-reload-hint">Reload to apply</span>
    </div>
    ${groupsHtml}
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
  const themeSelect = document.querySelector('[data-test-id="theme-select"]');
  if (themeSelect) {
    const inputLabel = themeSelect.closest('[data-test-id="input-label"]');
    if (inputLabel?.parentElement) {
      log.debug('Found injection point after theme select');
      return inputLabel.parentElement;
    }
  }

  const headings = document.querySelectorAll('.n8n-heading');
  for (const heading of headings) {
    if (heading.textContent?.trim() === 'Personalisation') {
      const container = heading.closest('div.mb-s')?.parentElement;
      if (container) {
        log.debug('Found injection point in Personalisation section');
        return container;
      }
    }
  }

  log.debug('No injection point found');
  return null;
}

export function injectSettingsPanel(): boolean {
  if (document.getElementById(CONTAINER_ID)) {
    log.debug('Panel already exists');
    return true;
  }

  const injectionPoint = findInjectionPoint();
  if (!injectionPoint) {
    log.debug('Injection point not found, will retry');
    return false;
  }

  if (injectionPoint.hasAttribute(MARKER_ATTR)) {
    log.debug('Injection point already marked');
    return true;
  }

  const container = createSettingsPanel();

  injectionPoint.setAttribute(MARKER_ATTR, 'true');
  injectionPoint.appendChild(container);

  attachEventListeners(container);

  log.debug('Settings panel injected');
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

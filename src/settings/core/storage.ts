import { extensionRegistry } from '@/extensions/registry';
import type { ExtensionEntry } from '@/extensions/types';
import { getSyncItem, setSyncItem } from '@/shared/utils/chrome-storage';
import { logger } from '@/shared/utils/logger';

const log = logger.child('settings:storage');

export const SETTINGS_KEY = 'n8n-xtend-settings';

type ExtensionSettings = Record<string, boolean>;

let cachedSettings: ExtensionSettings | null = null;

function getDefaultSettings(): ExtensionSettings {
  return extensionRegistry.reduce((acc, ext) => {
    acc[ext.id] = ext.enabledByDefault;
    return acc;
  }, {} as ExtensionSettings);
}

export function loadSettings(): void {
  cachedSettings = getSyncItem<ExtensionSettings>(SETTINGS_KEY);
  log.debug('Settings loaded', cachedSettings);
}

function resolveSettings(): ExtensionSettings {
  const defaults = getDefaultSettings();
  if (!cachedSettings) return defaults;
  return { ...defaults, ...cachedSettings };
}

export function isExtensionEnabled(extensionId: string): boolean {
  const settings = resolveSettings();
  const extension = extensionRegistry.find((ext) => ext.id === extensionId);
  return settings[extensionId] ?? extension?.enabledByDefault ?? true;
}

export function setExtensionEnabled(extensionId: string, enabled: boolean): void {
  log.debug('Extension setting changed', { extensionId, enabled });
  const settings = resolveSettings();
  settings[extensionId] = enabled;
  cachedSettings = settings;
  setSyncItem(SETTINGS_KEY, settings);
}

export function getEnabledExtensions(): ExtensionEntry[] {
  const settings = resolveSettings();
  return extensionRegistry.filter((ext) => settings[ext.id] ?? ext.enabledByDefault);
}

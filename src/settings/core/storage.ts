import { extensionRegistry } from '@/extensions/registry';
import type { ExtensionEntry } from '@/extensions/types';
import { getStorageItem, logger, setStorageItem } from '@/shared/utils';

const log = logger.child('settings:storage');

const SETTINGS_KEY = 'n8n-xtend-settings';

type ExtensionSettings = Record<string, boolean>;

function getDefaultSettings(): ExtensionSettings {
  return extensionRegistry.reduce((acc, ext) => {
    acc[ext.id] = ext.enabledByDefault;
    return acc;
  }, {} as ExtensionSettings);
}

export function getExtensionSettings(): ExtensionSettings {
  const stored = getStorageItem<ExtensionSettings>(SETTINGS_KEY);
  const defaults = getDefaultSettings();

  if (!stored) {
    return defaults;
  }

  return { ...defaults, ...stored };
}

export function setExtensionEnabled(extensionId: string, enabled: boolean): void {
  log.debug('Extension setting changed', { extensionId, enabled });
  const settings = getExtensionSettings();
  settings[extensionId] = enabled;
  setStorageItem(SETTINGS_KEY, settings);
}

export function isExtensionEnabled(extensionId: string): boolean {
  const settings = getExtensionSettings();
  const extension = extensionRegistry.find((ext) => ext.id === extensionId);
  return settings[extensionId] ?? extension?.enabledByDefault ?? true;
}

export function getEnabledExtensions(): ExtensionEntry[] {
  const settings = getExtensionSettings();
  return extensionRegistry.filter((ext) => settings[ext.id] ?? ext.enabledByDefault);
}

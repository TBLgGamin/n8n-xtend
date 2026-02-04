import { getStorageItem, setStorageItem } from '@/shared/utils';
import { EXTENSIONS, type ExtensionConfig } from '../config';

const SETTINGS_KEY = 'n8n-xtend-settings';

type ExtensionSettings = Record<string, boolean>;

function getDefaultSettings(): ExtensionSettings {
  return EXTENSIONS.reduce((acc, ext) => {
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
  const settings = getExtensionSettings();
  settings[extensionId] = enabled;
  setStorageItem(SETTINGS_KEY, settings);
}

export function isExtensionEnabled(extensionId: string): boolean {
  const settings = getExtensionSettings();
  const extension = EXTENSIONS.find((ext) => ext.id === extensionId);
  return settings[extensionId] ?? extension?.enabledByDefault ?? true;
}

export function getEnabledExtensions(): ExtensionConfig[] {
  const settings = getExtensionSettings();
  return EXTENSIONS.filter((ext) => settings[ext.id] ?? ext.enabledByDefault);
}

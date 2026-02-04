import { startMonitor } from './core';

export { EXTENSIONS, type ExtensionConfig } from './config';
export { isExtensionEnabled, getEnabledExtensions } from './core';

export function initSettingsExtension(): void {
  startMonitor();
}

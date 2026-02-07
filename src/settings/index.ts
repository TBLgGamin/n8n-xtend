import { startMonitor } from './core';

export { isExtensionEnabled, getEnabledExtensions } from './core';

export function initSettingsExtension(): void {
  startMonitor();
}

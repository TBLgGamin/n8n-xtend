import { logger } from '@/shared/utils';
import { startMonitor } from './core';

export { isExtensionEnabled, getEnabledExtensions } from './core';

const log = logger.child('settings');

export function initSettingsExtension(): void {
  log.info('Initializing settings extension');
  startMonitor();
}

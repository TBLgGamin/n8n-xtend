import {
  initCaptureExtension,
  initFolderTreeExtension,
  initSettingsExtension,
  initShowPasswordExtension,
  initVariablesExtension,
  isExtensionEnabled,
} from '@/extensions';
import { initStorage, initThemeManager, isN8nHost, logger } from '@/shared/utils';

function initExtensionSafely(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    logger.debug(`Extension "${name}" failed to initialize:`, error);
  }
}

function initIfEnabled(id: string, name: string, init: () => void): void {
  if (isExtensionEnabled(id)) {
    initExtensionSafely(name, init);
  } else {
    logger.debug(`Extension "${name}" is disabled`);
  }
}

async function initExtensions(): Promise<void> {
  if (!isN8nHost()) {
    return;
  }

  await initStorage();

  logger.debug('n8n-xtend loaded');

  initThemeManager();

  initExtensionSafely('settings', initSettingsExtension);

  initIfEnabled('folder-tree', 'folder-tree', initFolderTreeExtension);
  initIfEnabled('variables', 'variables', initVariablesExtension);
  initIfEnabled('capture', 'capture', initCaptureExtension);
  initIfEnabled('show-password', 'show-password', initShowPasswordExtension);
}

initExtensions();

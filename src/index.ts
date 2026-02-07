import { extensionRegistry } from '@/extensions';
import { initSettingsExtension, isExtensionEnabled } from '@/settings';
import { initStorage, initThemeManager, isN8nHost, logger } from '@/shared/utils';

function initExtensionSafely(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    logger.debug(`Extension "${name}" failed to initialize:`, error);
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

  for (const ext of extensionRegistry) {
    if (isExtensionEnabled(ext.id)) {
      initExtensionSafely(ext.id, ext.init);
    } else {
      logger.debug(`Extension "${ext.id}" is disabled`);
    }
  }
}

initExtensions();

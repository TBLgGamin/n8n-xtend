import { extensionRegistry } from '@/extensions';
import { isExtensionEnabled, loadSettings } from '@/settings';
import {
  initChromeStorage,
  initThemeManager,
  initUndoSystem,
  isN8nHost,
  logger,
} from '@/shared/utils';

function initExtensionSafely(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    logger.error(`Extension "${name}" failed to initialize`, error);
  }
}

async function initExtensions(): Promise<void> {
  if (!isN8nHost()) {
    return;
  }

  await initChromeStorage();
  loadSettings();

  logger.debug('n8n-xtend loaded');

  initThemeManager();
  initUndoSystem();

  for (const ext of extensionRegistry) {
    if (isExtensionEnabled(ext.id)) {
      initExtensionSafely(ext.id, ext.init);
    } else {
      logger.debug(`Extension "${ext.id}" is disabled`);
    }
  }
}

initExtensions();

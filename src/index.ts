import { initCaptureExtension, initTreeExtension, initVariablesExtension } from '@/extensions';
import { isN8nHost, logger } from '@/shared/utils';

function initExtensionSafely(name: string, init: () => void): void {
  try {
    init();
  } catch (error) {
    logger.error(`Extension "${name}" failed to initialize:`, error);
  }
}

function init(): void {
  if (!isN8nHost()) {
    return;
  }

  logger.info('n8n-xtend loaded');

  initExtensionSafely('tree', initTreeExtension);
  initExtensionSafely('variables', initVariablesExtension);
  initExtensionSafely('capture', initCaptureExtension);
}

init();

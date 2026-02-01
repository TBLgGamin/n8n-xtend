import { initTreeExtension } from '@/extensions/tree';
import { isN8nHost, logger } from '@/shared/utils';

function init(): void {
  if (!isN8nHost()) {
    return;
  }

  logger.info('n8n-xtend loaded');

  initTreeExtension();
}

init();

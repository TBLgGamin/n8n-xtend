import { initTreeExtension } from '@/extensions/tree';
import { initVariablesExtension } from '@/extensions/variables';
import { isN8nHost, logger } from '@/shared/utils';

function init(): void {
  if (!isN8nHost()) {
    return;
  }

  logger.info('n8n-xtend loaded');

  initTreeExtension();
  initVariablesExtension();
}

init();

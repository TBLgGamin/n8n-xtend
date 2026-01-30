import './styles/tree.css';
import { logger } from './utils/logger';
import { isN8nHost } from './utils/url';
import { startMonitor } from './core/monitor';

function init(): void {
  if (!isN8nHost()) {
    return;
  }

  logger.info('Extension loaded');
  startMonitor();
}

init();

import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('workflow-lint');

export const metadata: ExtensionMetadata = {
  id: 'workflow-lint',
  name: 'Workflow Linter',
  description:
    'Automatically formats workflows: positions nodes, generates sticky notes, fixes names, and adds numbering',
  howToUse:
    'Open the \u22ee menu on any workflow and click "Lint" to configure and run the linter. Use Capture to infer settings from the current workflow layout.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing workflow-lint extension');
  startMonitor();
}

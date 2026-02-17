import type { ExtensionMetadata } from '@/extensions/types';
import { logger } from '@/shared/utils';
import { startMonitor } from './core';

const log = logger.child('capture');

export const metadata: ExtensionMetadata = {
  id: 'capture',
  name: 'Workflow Capture',
  description: 'Export workflow diagrams as PNG or SVG images',
  howToUse:
    'Open any workflow in the editor. A camera icon appears in the top toolbar. Click it to open the export menu, then choose PNG for a raster image or SVG for a vector. The export captures the entire workflow canvas, including off-screen nodes.',
  enabledByDefault: true,
};

export function init(): void {
  log.info('Initializing capture extension');
  startMonitor();
}

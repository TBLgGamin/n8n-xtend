import type { ExtensionMetadata } from '@/extensions/types';
import { startMonitor } from './core/monitor';

export const metadata: ExtensionMetadata = {
  id: 'capture',
  name: 'Workflow Capture',
  description: 'Export workflow diagrams as PNG or SVG images',
  enabledByDefault: true,
};

export function initCaptureExtension(): void {
  startMonitor();
}

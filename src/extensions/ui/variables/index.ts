import type { ExtensionMetadata } from '@/extensions/types';
import { startMonitor } from './core';

export const metadata: ExtensionMetadata = {
  id: 'variables',
  name: 'Variables Syntax',
  description: 'Enhances variable display with proper syntax highlighting',
  enabledByDefault: true,
};

export function initVariablesExtension(): void {
  startMonitor();
}

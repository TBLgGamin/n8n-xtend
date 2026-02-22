import { findElementBySelectors, logger } from '@/shared/utils';
import type { NodeSize } from '../engine/types';

const log = logger.child('lint:measure');

const CANVAS_SELECTORS = ['.vue-flow__pane', '.vue-flow', '[class*="vue-flow"]'];
const VIEWPORT_SELECTORS = ['.vue-flow__transformationpane', '.vue-flow__viewport'];
const NODE_SELECTOR = '.vue-flow__node';

export function measureNodeDimensions(): Map<string, NodeSize> {
  const sizes = new Map<string, NodeSize>();

  const canvas = findElementBySelectors<HTMLElement>(document, CANVAS_SELECTORS);
  if (!canvas) return sizes;

  const viewport = findElementBySelectors<HTMLElement>(canvas, VIEWPORT_SELECTORS);
  if (!viewport) return sizes;

  const domNodes = viewport.querySelectorAll(NODE_SELECTOR);
  for (const domNode of domNodes) {
    const el = domNode as HTMLElement;
    const nodeId = el.getAttribute('data-id');
    if (!nodeId) continue;

    sizes.set(nodeId, {
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }

  log.debug('Measured node dimensions', { count: sizes.size });
  return sizes;
}

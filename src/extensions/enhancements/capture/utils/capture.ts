import { findElementBySelectors, logger } from '@/shared/utils';
import { domToBlob, domToSvg } from 'modern-screenshot';

const log = logger.child('capture:utils');

const CANVAS_SELECTORS = ['.vue-flow__pane', '.vue-flow', '[class*="vue-flow"]'];
const VIEWPORT_SELECTORS = ['.vue-flow__transformationpane', '.vue-flow__viewport'];
const NODE_SELECTOR = '.vue-flow__node';

const PADDING = 50;
const SCALE = 2;

const WORKFLOW_NAME_SELECTOR =
  '[data-test-id="workflow-name-input"] input, input[placeholder*="workflow"], .workflow-name input';
const INVALID_FILENAME_CHARS = /[/\\?%*:|"<>]/g;

function getWorkflowName(): string {
  const el = document.querySelector(WORKFLOW_NAME_SELECTOR) as HTMLInputElement | null;
  return el?.value ? el.value.replace(INVALID_FILENAME_CHARS, '-') : 'workflow';
}

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface CaptureContext {
  canvas: HTMLElement;
  viewport: HTMLElement;
  bounds: Bounds;
  captureWidth: number;
  captureHeight: number;
}

function calculateNodeBounds(viewport: Element): Bounds | null {
  const nodes = viewport.querySelectorAll(NODE_SELECTOR);

  if (nodes.length === 0) {
    log.debug('No nodes found');
    return null;
  }

  log.debug(`Found ${nodes.length} nodes`);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const el = node as HTMLElement;
    const transform = el.style.transform;
    const match = transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);

    if (match?.[1] && match[2]) {
      const x = Number.parseFloat(match[1]);
      const y = Number.parseFloat(match[2]);
      const width = el.offsetWidth;
      const height = el.offsetHeight;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }
  }

  if (minX === Number.POSITIVE_INFINITY) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

async function withAdjustedViewport<T>(
  callback: (ctx: CaptureContext) => Promise<T>,
): Promise<T | null> {
  const canvas = findElementBySelectors<HTMLElement>(document, CANVAS_SELECTORS);
  if (!canvas) {
    log.debug('Canvas not found');
    return null;
  }

  const viewport = findElementBySelectors<HTMLElement>(canvas, VIEWPORT_SELECTORS);
  if (!viewport) {
    log.debug('Viewport not found');
    return null;
  }

  const bounds = calculateNodeBounds(viewport);
  if (!bounds) {
    log.debug('Could not calculate bounds');
    return null;
  }

  const captureWidth = bounds.width + PADDING * 2;
  const captureHeight = bounds.height + PADDING * 2;

  const newX = -bounds.minX + PADDING;
  const newY = -bounds.minY + PADDING;

  const originalTransform = viewport.style.transform;
  const originalCanvasWidth = canvas.style.width;
  const originalCanvasHeight = canvas.style.height;
  const originalCanvasOverflow = canvas.style.overflow;

  viewport.style.transform = `translate(${newX}px, ${newY}px) scale(1)`;
  canvas.style.width = `${captureWidth}px`;
  canvas.style.height = `${captureHeight}px`;
  canvas.style.overflow = 'hidden';

  try {
    return await callback({ canvas, viewport, bounds, captureWidth, captureHeight });
  } finally {
    viewport.style.transform = originalTransform;
    canvas.style.width = originalCanvasWidth;
    canvas.style.height = originalCanvasHeight;
    canvas.style.overflow = originalCanvasOverflow;
  }
}

async function capturePng(): Promise<void> {
  await withAdjustedViewport(async ({ canvas, captureWidth, captureHeight }) => {
    const blob = await domToBlob(canvas, {
      width: captureWidth,
      height: captureHeight,
      scale: SCALE,
      backgroundColor: '#f5f5f5',
      style: {
        transform: 'none',
      },
    });

    if (blob) {
      const filename = `${getWorkflowName()}.png`;
      downloadFile(blob, filename);
      log.debug(`Captured as ${filename}`);
    }
  });
}

async function captureSvg(): Promise<void> {
  await withAdjustedViewport(async ({ canvas, captureWidth, captureHeight }) => {
    const svgDataUrl = await domToSvg(canvas, {
      width: captureWidth,
      height: captureHeight,
      backgroundColor: '#f5f5f5',
      style: {
        transform: 'none',
      },
    });

    if (svgDataUrl) {
      const base64Match = svgDataUrl.match(/^data:image\/svg\+xml;base64,(.+)$/);
      const utf8Match = svgDataUrl.match(/^data:image\/svg\+xml;charset=utf-8,(.+)$/);

      let svgContent: string;
      if (base64Match?.[1]) {
        svgContent = atob(base64Match[1]);
      } else if (utf8Match?.[1]) {
        svgContent = decodeURIComponent(utf8Match[1]);
      } else {
        svgContent = svgDataUrl;
      }

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const filename = `${getWorkflowName()}.svg`;
      downloadFile(blob, filename);
      log.debug(`Captured as ${filename}`);
    }
  });
}

export async function captureWorkflow(format: 'png' | 'svg'): Promise<void> {
  try {
    if (format === 'png') {
      await capturePng();
    } else {
      await captureSvg();
    }
  } catch (error) {
    log.debug('Failed to capture workflow', error);
  }
}

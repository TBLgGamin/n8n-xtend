export interface CanvasController {
  viewport: HTMLDivElement;
  transformLayer: HTMLDivElement;
  fitToView: () => void;
  panTo: (canvasX: number, canvasY: number) => void;
  getTransform: () => { panX: number; panY: number; scale: number };
  onTransformChange: (cb: () => void) => void;
  destroy: () => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
const FIT_PADDING = 40;

export function createCanvas(container: HTMLElement): CanvasController {
  const viewport = document.createElement('div');
  viewport.className = 'n8n-xtend-graph-viewport';

  const transformLayer = document.createElement('div');
  transformLayer.className = 'n8n-xtend-graph-transform';
  viewport.appendChild(transformLayer);
  container.appendChild(viewport);

  let panX = 40;
  let panY = 40;
  let scale = 1;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  let transformChangeCallback: (() => void) | null = null;

  function onTransformChange(cb: () => void): void {
    transformChangeCallback = cb;
  }

  function applyTransform(): void {
    transformLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    transformChangeCallback?.();
  }

  applyTransform();

  function fitToView(): void {
    const cards = transformLayer.querySelectorAll('.n8n-xtend-graph-card');
    if (cards.length === 0) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const card of cards) {
      const el = card as HTMLElement;
      const x = Number.parseFloat(el.style.left);
      const y = Number.parseFloat(el.style.top);
      const w = el.offsetWidth || 220;
      const h = el.offsetHeight || 80;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    if (contentWidth <= 0 || contentHeight <= 0) return;

    const viewWidth = viewport.clientWidth - FIT_PADDING * 2;
    const viewHeight = viewport.clientHeight - FIT_PADDING * 2;
    if (viewWidth <= 0 || viewHeight <= 0) return;

    const newScale = Math.min(
      Math.min(viewWidth / contentWidth, viewHeight / contentHeight),
      MAX_SCALE,
    );
    scale = Math.max(MIN_SCALE, newScale);
    panX = FIT_PADDING - minX * scale + (viewWidth - contentWidth * scale) / 2;
    panY = FIT_PADDING - minY * scale + (viewHeight - contentHeight * scale) / 2;
    applyTransform();
  }

  function panTo(canvasX: number, canvasY: number): void {
    panX = viewport.clientWidth / 2 - canvasX * scale;
    panY = viewport.clientHeight / 2 - canvasY * scale;
    applyTransform();
  }

  function getTransform(): { panX: number; panY: number; scale: number } {
    return { panX, panY, scale };
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.n8n-xtend-graph-card-link')) return;
    if (target.closest('.n8n-xtend-graph-toolbar')) return;
    if (target.closest('.n8n-xtend-graph-search')) return;

    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    viewport.classList.add('panning');
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent): void {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  }

  function onMouseUp(): void {
    if (!isPanning) return;
    isPanning = false;
    viewport.classList.remove('panning');
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = (mouseX - panX) / scale;
    const canvasY = (mouseY - panY) / scale;

    const factor = e.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));

    panX = mouseX - canvasX * newScale;
    panY = mouseY - canvasY * newScale;
    scale = newScale;

    applyTransform();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === '0' && (e.ctrlKey || e.metaKey) && viewport.isConnected) {
      e.preventDefault();
      panX = 40;
      panY = 40;
      scale = 1;
      applyTransform();
    }
  }

  viewport.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('keydown', onKeyDown);

  function destroy(): void {
    viewport.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    viewport.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKeyDown);
  }

  return { viewport, transformLayer, fitToView, panTo, getTransform, onTransformChange, destroy };
}

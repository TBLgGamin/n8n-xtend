export interface CanvasController {
  viewport: HTMLDivElement;
  transformLayer: HTMLDivElement;
  destroy: () => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

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

  function applyTransform(): void {
    transformLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  applyTransform();

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.n8n-xtend-graph-card-link')) return;

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

  return { viewport, transformLayer, destroy };
}

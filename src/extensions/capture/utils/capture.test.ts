import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureWorkflow } from './capture';

vi.mock('modern-screenshot', () => ({
  domToBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  domToSvg: vi.fn().mockResolvedValue('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),
}));

function createMockCanvas(): void {
  document.body.innerHTML = `
    <div class="vue-flow">
      <div class="vue-flow__viewport" style="transform: translate(100px, 50px) scale(1)">
        <div class="vue-flow__node" style="transform: translate(200px, 150px)"></div>
        <div class="vue-flow__node" style="transform: translate(400px, 300px)"></div>
      </div>
    </div>
    <input data-test-id="workflow-name-input" value="My Test Workflow" />
  `;

  const nodes = document.querySelectorAll('.vue-flow__node');
  for (const node of nodes) {
    Object.defineProperty(node, 'offsetWidth', { value: 150, configurable: true });
    Object.defineProperty(node, 'offsetHeight', { value: 100, configurable: true });
  }
}

describe('captureWorkflow', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    document.body.innerHTML = '';
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('captures PNG format', async () => {
    createMockCanvas();
    const { domToBlob } = await import('modern-screenshot');

    await captureWorkflow('png');

    expect(domToBlob).toHaveBeenCalled();
  });

  it('captures SVG format', async () => {
    createMockCanvas();
    const { domToSvg } = await import('modern-screenshot');

    await captureWorkflow('svg');

    expect(domToSvg).toHaveBeenCalled();
  });

  it('does nothing when canvas not found', async () => {
    document.body.innerHTML = '<div>No canvas</div>';
    const { domToBlob } = await import('modern-screenshot');

    await captureWorkflow('png');

    expect(domToBlob).not.toHaveBeenCalled();
  });

  it('does nothing when viewport not found', async () => {
    document.body.innerHTML = '<div class="vue-flow"></div>';
    const { domToBlob } = await import('modern-screenshot');

    await captureWorkflow('png');

    expect(domToBlob).not.toHaveBeenCalled();
  });

  it('does nothing when no nodes found', async () => {
    document.body.innerHTML = `
      <div class="vue-flow">
        <div class="vue-flow__viewport" style="transform: translate(0px, 0px) scale(1)">
        </div>
      </div>
    `;
    const { domToBlob } = await import('modern-screenshot');

    await captureWorkflow('png');

    expect(domToBlob).not.toHaveBeenCalled();
  });

  it('uses workflow name from input for filename', async () => {
    createMockCanvas();
    const linkClickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = linkClickSpy;
      }
      return el;
    });

    await captureWorkflow('png');

    expect(linkClickSpy).toHaveBeenCalled();
  });

  it('uses default workflow name when input not found', async () => {
    document.body.innerHTML = `
      <div class="vue-flow">
        <div class="vue-flow__viewport" style="transform: translate(100px, 50px) scale(1)">
          <div class="vue-flow__node" style="transform: translate(200px, 150px)"></div>
        </div>
      </div>
    `;

    const nodes = document.querySelectorAll('.vue-flow__node');
    for (const node of nodes) {
      Object.defineProperty(node, 'offsetWidth', { value: 150, configurable: true });
      Object.defineProperty(node, 'offsetHeight', { value: 100, configurable: true });
    }

    await captureWorkflow('png');

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles invalid viewport transform', async () => {
    document.body.innerHTML = `
      <div class="vue-flow">
        <div class="vue-flow__viewport" style="transform: rotate(45deg)">
          <div class="vue-flow__node" style="transform: translate(200px, 150px)"></div>
        </div>
      </div>
    `;

    const nodes = document.querySelectorAll('.vue-flow__node');
    for (const node of nodes) {
      Object.defineProperty(node, 'offsetWidth', { value: 150, configurable: true });
      Object.defineProperty(node, 'offsetHeight', { value: 100, configurable: true });
    }

    const { domToBlob } = await import('modern-screenshot');

    await captureWorkflow('png');

    expect(domToBlob).not.toHaveBeenCalled();
  });

  it('handles SVG with base64 encoding', async () => {
    createMockCanvas();
    const { domToSvg } = await import('modern-screenshot');
    (domToSvg as ReturnType<typeof vi.fn>).mockResolvedValue(
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    );

    await captureWorkflow('svg');

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles SVG with utf-8 encoding', async () => {
    createMockCanvas();
    const { domToSvg } = await import('modern-screenshot');
    (domToSvg as ReturnType<typeof vi.fn>).mockResolvedValue(
      'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E',
    );

    await captureWorkflow('svg');

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('sanitizes filename with invalid characters', async () => {
    document.body.innerHTML = `
      <div class="vue-flow">
        <div class="vue-flow__viewport" style="transform: translate(100px, 50px) scale(1)">
          <div class="vue-flow__node" style="transform: translate(200px, 150px)"></div>
        </div>
      </div>
      <input data-test-id="workflow-name-input" value="File/With:Invalid*Chars" />
    `;

    const nodes = document.querySelectorAll('.vue-flow__node');
    for (const node of nodes) {
      Object.defineProperty(node, 'offsetWidth', { value: 150, configurable: true });
      Object.defineProperty(node, 'offsetHeight', { value: 100, configurable: true });
    }

    let downloadFilename = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'download', {
          set(value) {
            downloadFilename = value;
          },
          get() {
            return downloadFilename;
          },
        });
      }
      return el;
    });

    await captureWorkflow('png');

    expect(downloadFilename).not.toContain('/');
    expect(downloadFilename).not.toContain(':');
    expect(downloadFilename).not.toContain('*');
  });

  it('handles domToBlob returning null', async () => {
    createMockCanvas();
    const { domToBlob } = await import('modern-screenshot');
    (domToBlob as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await captureWorkflow('png');

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('handles domToSvg returning null', async () => {
    createMockCanvas();
    const { domToSvg } = await import('modern-screenshot');
    (domToSvg as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await captureWorkflow('svg');

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('handles capture error gracefully', async () => {
    createMockCanvas();
    const { domToBlob } = await import('modern-screenshot');
    (domToBlob as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Capture failed'));

    await expect(captureWorkflow('png')).resolves.not.toThrow();
  });
});

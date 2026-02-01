import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initKeyboardNavigation, resetKeyboardFocus } from './keyboard';

Element.prototype.scrollIntoView = vi.fn();

function createTreeStructure(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'n8n-tree-view';
  container.innerHTML = `
    <div id="n8n-tree-content">
      <div class="n8n-tree-node">
        <div class="n8n-tree-item" data-item="1">
          <span class="n8n-tree-chevron"></span>
          <a class="n8n-tree-folder-link" href="/folder/1">Folder 1</a>
        </div>
        <div class="n8n-tree-children">
          <div class="n8n-tree-node">
            <a class="n8n-tree-item" href="/workflow/1" data-item="2">Workflow 1</a>
          </div>
        </div>
      </div>
      <div class="n8n-tree-node">
        <div class="n8n-tree-item" data-item="3">
          <span class="n8n-tree-chevron"></span>
          <a class="n8n-tree-folder-link" href="/folder/2">Folder 2</a>
        </div>
      </div>
    </div>
  `;

  const items = container.querySelectorAll('.n8n-tree-item');
  for (const item of items) {
    Object.defineProperty(item, 'offsetParent', { value: container, configurable: true });
  }

  return container;
}

describe('initKeyboardNavigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetKeyboardFocus();
  });

  it('returns cleanup function', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    const cleanup = initKeyboardNavigation(container);

    expect(typeof cleanup).toBe('function');
  });

  it('returns noop when tree content not found', () => {
    const container = document.createElement('div');
    const cleanup = initKeyboardNavigation(container);

    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('sets tabindex on tree content', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content');
    expect(content?.getAttribute('tabindex')).toBe('0');
  });

  it('sets role attribute on tree content', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content');
    expect(content?.getAttribute('role')).toBe('tree');
  });

  it('focuses first item on focus event', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    const firstItem = container.querySelector('.n8n-tree-item');
    expect(firstItem?.classList.contains('n8n-tree-focused')).toBe(true);
  });

  it('removes focus class on blur', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));
    content.dispatchEvent(new FocusEvent('blur'));

    const focused = container.querySelector('.n8n-tree-focused');
    expect(focused).toBeNull();
  });

  it('moves focus down on ArrowDown', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    content.dispatchEvent(event);

    const items = container.querySelectorAll('.n8n-tree-item');
    expect(items[1]?.classList.contains('n8n-tree-focused')).toBe(true);
  });

  it('moves focus up on ArrowUp', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    const items = container.querySelectorAll('.n8n-tree-item');
    expect(items[1]?.classList.contains('n8n-tree-focused')).toBe(true);
  });

  it('moves to first item on Home', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

    const firstItem = container.querySelector('.n8n-tree-item');
    expect(firstItem?.classList.contains('n8n-tree-focused')).toBe(true);
  });

  it('moves to last item on End', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

    const items = container.querySelectorAll('.n8n-tree-item');
    const lastItem = items[items.length - 1];
    expect(lastItem?.classList.contains('n8n-tree-focused')).toBe(true);
  });

  it('prevents default on handled keys', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    content.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not prevent default on unhandled keys', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    content.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('clicks chevron on Space', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    const chevron = container.querySelector('.n8n-tree-chevron') as HTMLElement;
    const clickSpy = vi.fn();
    chevron.onclick = clickSpy;

    content.dispatchEvent(new FocusEvent('focus'));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('cleanup removes event listeners', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    const cleanup = initKeyboardNavigation(container);
    cleanup();

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));

    const focused = container.querySelector('.n8n-tree-focused');
    expect(focused).toBeNull();
  });
});

describe('resetKeyboardFocus', () => {
  it('resets focus index', () => {
    const container = createTreeStructure();
    document.body.appendChild(container);

    initKeyboardNavigation(container);

    const content = container.querySelector('#n8n-tree-content') as HTMLElement;
    content.dispatchEvent(new FocusEvent('focus'));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    resetKeyboardFocus();

    content.dispatchEvent(new FocusEvent('focus'));

    const firstItem = container.querySelector('.n8n-tree-item');
    expect(firstItem?.classList.contains('n8n-tree-focused')).toBe(true);
  });
});

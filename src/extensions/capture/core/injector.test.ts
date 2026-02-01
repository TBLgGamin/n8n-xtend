import { beforeEach, describe, expect, it, vi } from 'vitest';
import { injectCaptureMenuItem } from './injector';

vi.mock('../utils/capture', () => ({
  captureWorkflow: vi.fn(),
}));

function createMockMenu(): { menu: HTMLElement; downloadItem: HTMLElement } {
  const menu = document.createElement('ul');
  menu.className = 'el-dropdown-menu';

  const li = document.createElement('li');
  const downloadItem = document.createElement('div');
  downloadItem.setAttribute('data-test-id', 'workflow-menu-item-download');
  li.appendChild(downloadItem);
  menu.appendChild(li);

  const popper = document.createElement('div');
  popper.className = 'el-dropdown__popper';
  popper.appendChild(menu);
  document.body.appendChild(popper);

  return { menu, downloadItem };
}

describe('injectCaptureMenuItem', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('creates capture menu item', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)');
    expect(captureItem).not.toBeNull();
  });

  it('inserts after download item', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const downloadLi = downloadItem.closest('li');
    const captureItem = downloadLi?.nextElementSibling;
    expect(captureItem?.textContent).toContain('Capture');
  });

  it('sets correct aria attributes', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)');
    expect(captureItem?.getAttribute('role')).toBe('menuitem');
    expect(captureItem?.getAttribute('tabindex')).toBe('-1');
    expect(captureItem?.getAttribute('aria-disabled')).toBe('false');
  });

  it('has correct class name', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)');
    expect(captureItem?.className).toBe('el-dropdown-menu__item');
  });

  it('displays "Capture as image" label', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)');
    expect(captureItem?.textContent).toContain('Capture as image');
  });

  it('stops event propagation on click', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    const stopImmediatePropagationSpy = vi.spyOn(event, 'stopImmediatePropagation');

    captureItem.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(stopImmediatePropagationSpy).toHaveBeenCalled();
  });

  it('prevents default on click', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    captureItem.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('hides popper on click', () => {
    const { menu, downloadItem } = createMockMenu();
    const popper = menu.closest('.el-dropdown__popper') as HTMLElement;

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;
    captureItem.click();

    expect(popper.style.display).toBe('none');
  });

  it('handles hover state', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;

    captureItem.dispatchEvent(new MouseEvent('mouseenter'));
    expect(captureItem.style.backgroundColor).toBe('rgb(245, 245, 245)');

    captureItem.dispatchEvent(new MouseEvent('mouseleave'));
    expect(captureItem.style.backgroundColor).toBe('');
  });

  it('stops mousedown propagation', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    captureItem.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('stops mouseup propagation', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;
    const event = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    captureItem.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('stops pointerdown propagation', () => {
    const { menu, downloadItem } = createMockMenu();

    injectCaptureMenuItem(menu, downloadItem);

    const captureItem = menu.querySelector('li:nth-child(2)') as HTMLElement;
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    captureItem.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('appends after download when not in li', () => {
    const menu = document.createElement('ul');
    const downloadItem = document.createElement('div');
    downloadItem.setAttribute('data-test-id', 'workflow-menu-item-download');
    menu.appendChild(downloadItem);

    const popper = document.createElement('div');
    popper.className = 'el-dropdown__popper';
    popper.appendChild(menu);
    document.body.appendChild(popper);

    injectCaptureMenuItem(menu, downloadItem);

    expect(downloadItem.nextElementSibling?.textContent).toContain('Capture');
  });
});

import { getThemeColors, logger } from '@/shared/utils';
import { captureWorkflow } from '../utils/capture';

const log = logger.child('capture:injector');

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>`;

function getExistingMenuItemClasses(menu: HTMLElement): {
  itemClass: string;
  containerClass: string;
  labelClass: string;
} {
  const existingItem = menu.querySelector('li[class*="_elementItem"]');
  const existingContainer = menu.querySelector('div[class*="_itemContainer"]');
  const existingLabel = menu.querySelector('span[class*="_label"]');

  return {
    itemClass: existingItem?.className || 'el-dropdown-menu__item',
    containerClass: existingContainer?.className || '',
    labelClass: existingLabel?.className || '',
  };
}

function createCaptureMenuItem(menu: HTMLElement): HTMLLIElement {
  const classes = getExistingMenuItemClasses(menu);

  const li = document.createElement('li');
  li.className = classes.itemClass;
  li.setAttribute('data-el-collection-item', '');
  li.setAttribute('tabindex', '-1');
  li.setAttribute('aria-disabled', 'false');
  li.setAttribute('role', 'menuitem');

  const container = document.createElement('div');
  container.className = classes.containerClass;

  const label = document.createElement('span');
  label.className = classes.labelClass;
  label.textContent = 'Capture as image';

  container.appendChild(label);
  li.appendChild(container);

  return li;
}

function injectStyles(): void {
  if (document.getElementById('n8n-capture-styles')) return;

  const style = document.createElement('style');
  style.id = 'n8n-capture-styles';
  style.textContent = `
    @keyframes n8n-capture-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes n8n-capture-slide-in {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function showFormatDialog(): void {
  injectStyles();
  const colors = getThemeColors();

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2100;
    background-color: ${colors.overlay};
    display: flex;
    align-items: center;
    justify-content: center;
    animation: n8n-capture-fade-in 0.15s ease-out;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 400px;
    border: 1px solid ${colors.borderPrimary};
    border-radius: 8px;
    background: ${colors.bgPrimary};
    box-shadow: 0 6px 16px ${colors.shadow};
    font-family: InterVariable, sans-serif;
    animation: n8n-capture-slide-in 0.15s ease-out;
  `;

  const header = document.createElement('header');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 24px 16px;
  `;

  const title = document.createElement('h1');
  title.style.cssText = `
    margin: 0;
    font-size: 20px;
    font-weight: 400;
    color: ${colors.textPrimary};
  `;
  title.textContent = 'Capture';

  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    color: ${colors.textMuted};
    cursor: pointer;
    transition: color 0.15s;
  `;
  closeBtn.innerHTML = `<i style="width: 16px; height: 16px;">${CLOSE_ICON}</i>`;
  closeBtn.onmouseenter = () => {
    closeBtn.style.color = colors.brandPrimary;
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.color = colors.textMuted;
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.cssText = `
    padding: 0 24px 24px;
    color: ${colors.textSecondary};
    font-size: 14px;
  `;

  const subtitle = document.createElement('p');
  subtitle.style.cssText = 'margin: 0 0 24px 0;';
  subtitle.textContent = 'Export your workflow as an image file';

  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

  const createBtn = (label: string, primary: boolean) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      padding: 8px 16px;
      border-radius: 4px;
      font-family: InterVariable, sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid ${primary ? colors.brandPrimary : colors.borderButton};
      background: ${primary ? colors.brandPrimary : colors.bgPrimary};
      color: ${primary ? '#fff' : colors.textButton};
    `;
    btn.onmouseenter = () => {
      btn.style.background = primary ? colors.brandHover : colors.bgPrimary;
      btn.style.borderColor = primary ? colors.brandHover : colors.brandPrimary;
      if (!primary) btn.style.color = colors.brandPrimary;
    };
    btn.onmouseleave = () => {
      btn.style.background = primary ? colors.brandPrimary : colors.bgPrimary;
      btn.style.borderColor = primary ? colors.brandPrimary : colors.borderButton;
      if (!primary) btn.style.color = colors.textButton;
    };
    return btn;
  };

  const svgBtn = createBtn('SVG', false);
  const pngBtn = createBtn('PNG', true);

  buttonRow.appendChild(svgBtn);
  buttonRow.appendChild(pngBtn);
  body.appendChild(subtitle);
  body.appendChild(buttonRow);
  dialog.appendChild(header);
  dialog.appendChild(body);
  overlay.appendChild(dialog);

  const close = () => overlay.remove();

  const capture = (format: 'png' | 'svg') => {
    close();
    log.debug(`Capturing workflow as ${format.toUpperCase()}`);
    captureWorkflow(format);
  };

  svgBtn.onclick = () => capture('svg');
  pngBtn.onclick = () => capture('png');
  closeBtn.onclick = close;
  overlay.onclick = (e) => e.target === overlay && close();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  document.body.appendChild(overlay);
  pngBtn.focus();
}

export function injectCaptureMenuItem(menu: HTMLElement, downloadItem: HTMLElement): void {
  const captureItem = createCaptureMenuItem(menu);

  const handleClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const popper = menu.closest('.el-dropdown__popper') as HTMLElement;
    if (popper) popper.style.display = 'none';

    showFormatDialog();
  };

  captureItem.addEventListener('click', handleClick, true);
  captureItem.addEventListener('mousedown', (e) => e.stopPropagation(), true);
  captureItem.addEventListener('mouseup', (e) => e.stopPropagation(), true);
  captureItem.addEventListener('pointerdown', (e) => e.stopPropagation(), true);
  captureItem.addEventListener('pointerup', (e) => e.stopPropagation(), true);

  const downloadLi = downloadItem.closest('li');
  if (downloadLi) {
    downloadLi.after(captureItem);
  } else {
    downloadItem.after(captureItem);
  }

  log.debug('Capture menu item injected');
}

import { logger } from '@/shared/utils';
import { captureWorkflow } from '../utils/capture';

const log = logger.child('capture:injector');

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>`;

function createCaptureMenuItem(): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'el-dropdown-menu__item';
  li.setAttribute('tabindex', '-1');
  li.setAttribute('aria-disabled', 'false');
  li.setAttribute('role', 'menuitem');
  li.style.cssText = `
    list-style: none;
    padding: 0;
    cursor: pointer;
    font-size: 14px;
    font-weight: 400;
    line-height: 36px;
    white-space: nowrap;
    text-align: left;
    color: rgb(117, 117, 117);
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    padding: 6px 8px;
    font-size: 12px;
    line-height: 18px;
    text-align: left;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    cursor: pointer;
  `;

  const label = document.createElement('span');
  label.style.cssText = `
    display: block;
    font-size: 12px;
    font-weight: 400;
    line-height: 18px;
    text-align: left;
    color: rgb(117, 117, 117);
    flex: 1 1 auto;
  `;
  label.textContent = 'Capture as image';

  container.appendChild(label);
  li.appendChild(container);

  li.addEventListener('mouseenter', () => {
    li.style.backgroundColor = 'rgb(245, 245, 245)';
  });

  li.addEventListener('mouseleave', () => {
    li.style.backgroundColor = '';
  });

  return li;
}

function injectDialogStyles(): void {
  if (document.getElementById('n8n-capture-dialog-styles')) return;

  const style = document.createElement('style');
  style.id = 'n8n-capture-dialog-styles';
  style.textContent = `
    @keyframes n8n-capture-dialog-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes n8n-capture-dialog-slide-in {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

function showFormatDialog(): Promise<'png' | 'svg' | null> {
  return new Promise((resolve) => {
    injectDialogStyles();

    const overlay = document.createElement('div');
    overlay.className = 'el-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2100;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: n8n-capture-dialog-fade-in 0.2s ease-out;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'el-dialog el-dialog--center';
    dialog.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 400px;
      min-width: 300px;
      border: 1px solid rgb(224, 224, 224);
      border-radius: 8px;
      background: rgb(255, 255, 255);
      box-shadow: rgba(68, 28, 23, 0.06) 0px 6px 16px 0px;
      font-family: InterVariable, sans-serif;
      animation: n8n-capture-dialog-slide-in 0.2s ease-out;
    `;

    const header = document.createElement('header');
    header.className = 'el-dialog__header';
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
      line-height: 25px;
      color: rgb(43, 43, 43);
    `;
    title.textContent = 'Capture';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'el-dialog__headerbtn';
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
      color: rgb(148, 148, 148);
      cursor: pointer;
    `;
    closeBtn.innerHTML = `<i class="el-icon el-dialog__close" style="width: 16px; height: 16px;">${CLOSE_ICON}</i>`;

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = 'rgb(255, 109, 90)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = 'rgb(148, 148, 148)';
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'el-dialog__body';
    body.style.cssText = `
      padding: 0 24px 24px;
      color: rgb(117, 117, 117);
      font-size: 14px;
      line-height: 18.9px;
    `;

    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'margin: 0 0 24px 0;';
    subtitle.textContent = 'Export your workflow as an image file';
    body.appendChild(subtitle);

    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    `;

    const createButton = (text: string, isPrimary: boolean) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display: block;
        padding: ${isPrimary ? '8px 12px' : '6px 12px'};
        border-radius: 4px;
        font-family: InterVariable, sans-serif;
        font-size: 12px;
        font-weight: 500;
        line-height: 12px;
        white-space: nowrap;
        cursor: pointer;
        transition: 0.3s;
        border: 1px solid ${isPrimary ? 'rgb(255, 109, 90)' : 'rgb(173, 173, 173)'};
        background: ${isPrimary ? 'rgb(255, 109, 90)' : 'rgb(255, 255, 255)'};
        color: ${isPrimary ? 'rgb(255, 255, 255)' : 'rgb(77, 77, 77)'};
      `;

      const span = document.createElement('span');
      span.textContent = text;
      btn.appendChild(span);

      btn.addEventListener('mouseenter', () => {
        if (isPrimary) {
          btn.style.background = 'rgb(255, 85, 69)';
          btn.style.borderColor = 'rgb(255, 85, 69)';
        } else {
          btn.style.borderColor = 'rgb(255, 109, 90)';
          btn.style.color = 'rgb(255, 109, 90)';
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (isPrimary) {
          btn.style.background = 'rgb(255, 109, 90)';
          btn.style.borderColor = 'rgb(255, 109, 90)';
        } else {
          btn.style.borderColor = 'rgb(173, 173, 173)';
          btn.style.color = 'rgb(77, 77, 77)';
        }
      });

      return btn;
    };

    const svgButton = createButton('SVG', false);
    const pngButton = createButton('PNG', true);

    const cleanup = () => overlay.remove();

    pngButton.addEventListener('click', () => {
      cleanup();
      resolve('png');
    });

    svgButton.addEventListener('click', () => {
      cleanup();
      resolve('svg');
    });

    closeBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
        document.removeEventListener('keydown', escHandler);
      }
    });

    footer.appendChild(svgButton);
    footer.appendChild(pngButton);
    body.appendChild(footer);

    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    pngButton.focus();
  });
}

async function handleCaptureClick(): Promise<void> {
  const format = await showFormatDialog();
  if (!format) {
    return;
  }

  log.info(`Capturing workflow as ${format.toUpperCase()}`);
  await captureWorkflow(format);
}

export function injectCaptureMenuItem(menu: HTMLElement, downloadItem: HTMLElement): void {
  const captureItem = createCaptureMenuItem();

  const handleClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const popper = menu.closest('.el-dropdown__popper') as HTMLElement;
    if (popper) {
      popper.style.display = 'none';
    }

    handleCaptureClick();
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

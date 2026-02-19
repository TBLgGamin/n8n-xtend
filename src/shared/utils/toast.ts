import { logger } from './logger';

const log = logger.child('toast');

const TOAST_CONTAINER_ID = 'n8n-xtend-toast-container';
const TOAST_DURATION_MS = 6000;
const TOAST_FADE_MS = 300;

const SUCCESS_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="20" height="20" fill="none"><circle cx="8" cy="8" r="8" fill="currentColor"/><path d="M4.5 8L7 10.5L11.5 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) return container;

  container = document.createElement('div');
  container.id = TOAST_CONTAINER_ID;
  document.body.appendChild(container);
  return container;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number;
}

export function showToast(options: ToastOptions): void {
  const container = getOrCreateContainer();
  const toast = document.createElement('div');
  toast.className = 'n8n-xtend-toast';

  const icon = document.createElement('span');
  icon.className = 'n8n-xtend-toast-icon';
  icon.innerHTML = SUCCESS_ICON_SVG;
  toast.appendChild(icon);

  const messageSpan = document.createElement('span');
  messageSpan.className = 'n8n-xtend-toast-message';
  messageSpan.textContent = options.message;
  toast.appendChild(messageSpan);

  if (options.action) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'n8n-xtend-toast-action';
    actionBtn.textContent = options.action.label;
    const handler = options.action.onClick;
    actionBtn.addEventListener('click', () => {
      handler();
      removeToast(toast);
    });
    toast.appendChild(actionBtn);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'n8n-xtend-toast-dismiss';
  dismissBtn.textContent = '\u00d7';
  dismissBtn.addEventListener('click', () => removeToast(toast));
  toast.appendChild(dismissBtn);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('n8n-xtend-toast-visible'));

  const duration = options.duration ?? TOAST_DURATION_MS;
  setTimeout(() => removeToast(toast), duration);
  log.debug('Toast shown', { message: options.message });
}

function removeToast(toast: HTMLElement): void {
  if (!toast.parentElement) return;
  toast.classList.remove('n8n-xtend-toast-visible');
  toast.classList.add('n8n-xtend-toast-hiding');
  setTimeout(() => toast.remove(), TOAST_FADE_MS);
}

import type { MessageRequest, MessageResponse } from '../background/types';

function sendMessage(message: MessageRequest): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

function isN8nCloudOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.n8n.cloud');
  } catch {
    return false;
  }
}

function normalizeToOrigin(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function escapeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderOrigins(origins: string[]): void {
  const list = document.getElementById('origins-list');
  if (!list) return;

  if (origins.length === 0) {
    list.innerHTML = '<p class="n8n-xtend-popup-empty">No instances added yet.</p>';
    return;
  }

  list.innerHTML = origins
    .map(
      (origin) =>
        `<div class="n8n-xtend-popup-origin-row">
          <span class="n8n-xtend-popup-origin-url">${escapeText(origin)}</span>
          <button class="n8n-xtend-popup-remove-btn" data-origin="${escapeText(origin)}">&times;</button>
        </div>`,
    )
    .join('');

  for (const btn of list.querySelectorAll<HTMLButtonElement>('.n8n-xtend-popup-remove-btn')) {
    btn.addEventListener('click', async () => {
      const origin = btn.dataset.origin;
      if (!origin) return;
      await sendMessage({ type: 'REMOVE_ORIGIN', origin });
      await loadOrigins();
    });
  }
}

function showError(message: string): void {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function clearError(): void {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

async function loadOrigins(): Promise<void> {
  const response = await sendMessage({ type: 'GET_ORIGINS' });
  if (response.success) {
    renderOrigins(response.origins);
  }
}

function setupAddButton(): void {
  const addBtn = document.getElementById('add-btn');
  const input = document.getElementById('origin-input') as HTMLInputElement | null;
  if (!addBtn || !input) return;

  addBtn.addEventListener('click', async () => {
    clearError();

    const raw = input.value.trim();
    if (!raw) {
      showError('Please enter a URL.');
      return;
    }

    const origin = normalizeToOrigin(raw);
    if (!origin) {
      showError('Please enter a valid URL (e.g. https://n8n.example.com).');
      return;
    }

    if (isN8nCloudOrigin(origin)) {
      showError('n8n Cloud instances are already supported automatically.');
      return;
    }

    const matchPattern = `${origin}/*`;

    let granted: boolean;
    try {
      granted = await chrome.permissions.request({ origins: [matchPattern] });
    } catch {
      showError('Permission request failed. Please try again.');
      return;
    }

    if (!granted) {
      showError('Permission was denied. The extension needs access to work on this instance.');
      return;
    }

    const response = await sendMessage({ type: 'ADD_ORIGIN', origin });
    if (!response.success) {
      showError(response.error);
      return;
    }

    input.value = '';
    await loadOrigins();
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      addBtn.click();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadOrigins();
  setupAddButton();
});

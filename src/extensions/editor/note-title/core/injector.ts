import { emit, escapeHtml, logger } from '@/shared/utils';

const log = logger.child('note-title:injector');

const STICKY_SELECTOR = '[data-test-id="sticky"]';
const SELECTED_CLASS_PATTERN = '_selected_';
const MARKDOWN_H2_SELECTOR = '.n8n-markdown h2';
const TEXTAREA_SELECTOR = '.sticky-textarea textarea';

const CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>';

function findSelectedSticky(): HTMLElement | null {
  const stickies = document.querySelectorAll(STICKY_SELECTOR);
  for (const sticky of stickies) {
    if (sticky.className.includes(SELECTED_CLASS_PATTERN)) {
      return sticky as HTMLElement;
    }
  }
  return null;
}

function extractCurrentTitle(sticky: HTMLElement): string {
  const h2 = sticky.querySelector(MARKDOWN_H2_SELECTOR);
  if (h2?.textContent) return h2.textContent.trim();

  const textarea = sticky.querySelector(TEXTAREA_SELECTOR) as HTMLTextAreaElement | null;
  if (textarea) {
    const match = textarea.value.match(/^##\s+(.+)$/m);
    if (match?.[1]) return match[1].trim();
  }

  return '';
}

function applyTitle(sticky: HTMLElement, newTitle: string): void {
  const textarea = sticky.querySelector(TEXTAREA_SELECTOR) as HTMLTextAreaElement | null;

  if (textarea) {
    const currentValue = textarea.value;
    const headerPattern = /^##\s+.+$/m;

    const updatedValue = headerPattern.test(currentValue)
      ? currentValue.replace(headerPattern, `## ${newTitle}`)
      : `## ${newTitle}\n${currentValue}`;

    textarea.focus();
    textarea.value = updatedValue;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.blur();
  }

  const h2 = sticky.querySelector(MARKDOWN_H2_SELECTOR);
  if (h2) h2.textContent = newTitle;
}

function showRenameDialog(sticky: HTMLElement, currentTitle: string): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position: fixed; inset: 0; z-index: 2100; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5);';

  const messageBox = document.createElement('div');
  messageBox.className = 'el-message-box rename-prompt';
  messageBox.tabIndex = -1;

  const header = document.createElement('div');
  header.className = 'el-message-box__header';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'el-message-box__title';

  const titleSpan = document.createElement('span');
  titleSpan.textContent = 'Rename Note';
  titleDiv.appendChild(titleSpan);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'el-message-box__headerbtn';
  closeBtn.setAttribute('aria-label', 'Close this dialog');
  closeBtn.innerHTML = `<i class="el-icon el-message-box__close">${CLOSE_ICON}</i>`;

  header.appendChild(titleDiv);
  header.appendChild(closeBtn);

  const content = document.createElement('div');
  content.className = 'el-message-box__content';

  const container = document.createElement('div');
  container.className = 'el-message-box__container';

  const messageDiv = document.createElement('div');
  messageDiv.className = 'el-message-box__message';

  const label = document.createElement('label');
  label.textContent = 'New Name:';
  messageDiv.appendChild(label);
  container.appendChild(messageDiv);

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'el-message-box__input';

  const elInput = document.createElement('div');
  elInput.className = 'el-input';

  const elInputWrapper = document.createElement('div');
  elInputWrapper.className = 'el-input__wrapper';
  elInputWrapper.tabIndex = -1;

  const input = document.createElement('input');
  input.className = 'el-input__inner';
  input.type = 'text';
  input.autocomplete = 'off';
  input.tabIndex = 0;
  input.value = currentTitle;

  elInputWrapper.appendChild(input);
  elInput.appendChild(elInputWrapper);

  const errMsg = document.createElement('div');
  errMsg.className = 'el-message-box__errormsg';
  errMsg.style.visibility = 'hidden';

  inputWrapper.appendChild(elInput);
  inputWrapper.appendChild(errMsg);

  content.appendChild(container);
  content.appendChild(inputWrapper);

  const btns = document.createElement('div');
  btns.className = 'el-message-box__btns';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'el-button btn--cancel';
  const cancelSpan = document.createElement('span');
  cancelSpan.textContent = 'Cancel';
  cancelBtn.appendChild(cancelSpan);

  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'el-button el-button--primary btn--confirm';
  const renameSpan = document.createElement('span');
  renameSpan.textContent = 'Rename';
  renameBtn.appendChild(renameSpan);

  btns.appendChild(cancelBtn);
  btns.appendChild(renameBtn);

  messageBox.appendChild(header);
  messageBox.appendChild(content);
  messageBox.appendChild(btns);
  overlay.appendChild(messageBox);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
  };

  const confirm = () => {
    const newTitle = input.value.trim();
    if (newTitle) {
      log.debug(`Renaming note to: ${escapeHtml(newTitle)}`);
      applyTitle(sticky, newTitle);
      const noteId = sticky.dataset.id ?? sticky.id ?? '';
      emit('note-title:renamed', { noteId, title: newTitle });
    }
    close();
  };

  closeBtn.onclick = close;
  cancelBtn.onclick = close;
  renameBtn.onclick = confirm;
  overlay.onclick = (e) => e.target === overlay && close();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Enter') {
      e.stopPropagation();
      confirm();
    }
  };
  document.addEventListener('keydown', onKey, true);

  document.body.appendChild(overlay);
  input.focus();
  input.select();
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (isEditableTarget(e)) return;

  const sticky = findSelectedSticky();
  if (!sticky) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const currentTitle = extractCurrentTitle(sticky);
  log.debug('Opening rename dialog for sticky note');
  showRenameDialog(sticky, currentTitle);
}

export function attachKeyboardListener(): void {
  document.addEventListener('keydown', handleKeydown, true);
}

export function detachKeyboardListener(): void {
  document.removeEventListener('keydown', handleKeydown, true);
}

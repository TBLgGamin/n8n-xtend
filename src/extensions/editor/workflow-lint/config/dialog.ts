import {
  CLOSE_ICON_SVG,
  createDebounced,
  emit,
  getThemeColors,
  getWorkflowIdFromUrl,
  logger,
  showToast,
} from '@/shared/utils';
import { fetchWorkflowForLint } from '../api';
import { measureNodeDimensions } from '../core/measure';
import { DEFAULT_LINT_CONFIG } from '../engine/defaults';
import type { LintConfig } from '../engine/types';
import { captureConfigFromWorkflow } from './capture';
import { loadLintConfig, saveLintConfig, validateLintConfig } from './storage';

const log = logger.child('lint:dialog');

const MAX_UNDO = 50;

type Colors = ReturnType<typeof getThemeColors>;

function injectStyles(): void {
  if (document.getElementById('n8n-lint-dialog-styles')) return;
  const style = document.createElement('style');
  style.id = 'n8n-lint-dialog-styles';
  style.textContent = `
    @keyframes n8n-lint-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes n8n-lint-slide-in { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
}

function createButton(label: string, primary: boolean, colors: Colors): HTMLButtonElement {
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
}

export function showLintDialog(onLint: () => Promise<void>): void {
  injectStyles();
  const colors = getThemeColors();
  const config = loadLintConfig();
  const undoStack: string[] = [];

  function pushUndo(json: string): void {
    undoStack.push(json);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2100;
    background-color: ${colors.overlay};
    display: flex;
    align-items: center;
    justify-content: center;
    animation: n8n-lint-fade-in 0.15s ease-out;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 520px;
    max-height: 80vh;
    border: 1px solid ${colors.borderPrimary};
    border-radius: 8px;
    background: ${colors.bgPrimary};
    box-shadow: 0 6px 16px ${colors.shadow};
    font-family: InterVariable, sans-serif;
    animation: n8n-lint-slide-in 0.15s ease-out;
  `;

  const header = document.createElement('header');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 24px 16px;
    flex-shrink: 0;
  `;

  const title = document.createElement('h1');
  title.style.cssText = `
    margin: 0;
    font-size: 20px;
    font-weight: 400;
    color: ${colors.textPrimary};
  `;
  title.textContent = 'Lint';

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
  closeBtn.innerHTML = `<i style="width: 16px; height: 16px;">${CLOSE_ICON_SVG}</i>`;
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
    overflow-y: auto;
    flex: 1;
  `;

  const textarea = document.createElement('textarea');
  textarea.style.cssText = `
    width: 100%;
    height: 320px;
    padding: 12px;
    border: 1px solid ${colors.borderPrimary};
    border-radius: 4px;
    background: ${colors.bgPrimary};
    color: ${colors.textPrimary};
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 12px;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
    tab-size: 2;
  `;
  textarea.value = JSON.stringify(config, null, 2);
  textarea.spellcheck = false;

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = `${textarea.value.substring(0, start)}  ${textarea.value.substring(end)}`;
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = start + 2;
    }
  });

  const errorArea = document.createElement('div');
  errorArea.style.cssText = `
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    background: ${colors.errorBg};
    color: ${colors.errorText};
    font-size: 12px;
    white-space: pre-line;
    display: none;
  `;

  const debouncedSave = createDebounced(() => {
    try {
      const parsed = JSON.parse(textarea.value) as LintConfig;
      const { config: validated, errors } = validateLintConfig(parsed);
      saveLintConfig(validated);
      emit('workflow-lint:config-changed', {});
      if (errors.length > 0) {
        errorArea.textContent = errors.join('\n');
        errorArea.style.display = 'block';
      } else {
        errorArea.style.display = 'none';
      }
    } catch {
      errorArea.textContent = 'Invalid JSON';
      errorArea.style.display = 'block';
    }
  }, 500);
  textarea.addEventListener('input', () => debouncedSave());

  const actionRow = document.createElement('div');
  actionRow.style.cssText = 'display: flex; gap: 8px; margin-top: 12px;';

  const captureBtn = createButton('Capture', false, colors);
  const resetBtn = createButton('Reset', false, colors);

  captureBtn.onclick = async () => {
    const workflowId = getWorkflowIdFromUrl();
    if (!workflowId) {
      showToast({ message: 'No workflow detected' });
      return;
    }
    const originalLabel = captureBtn.textContent;
    captureBtn.textContent = 'Capturing...';
    captureBtn.disabled = true;
    try {
      const workflowData = await fetchWorkflowForLint(workflowId);
      if (!workflowData) {
        showToast({ message: 'Failed to fetch workflow' });
        return;
      }
      const nodeSizes = measureNodeDimensions();
      const captured = captureConfigFromWorkflow(
        workflowData.nodes,
        workflowData.connections,
        nodeSizes,
      );
      pushUndo(textarea.value);
      textarea.value = JSON.stringify(captured, null, 2);
      saveLintConfig(captured);
      emit('workflow-lint:config-changed', {});
      errorArea.style.display = 'none';
      log.debug('Config captured from workflow');
    } finally {
      captureBtn.textContent = originalLabel;
      captureBtn.disabled = false;
    }
  };

  resetBtn.onclick = () => {
    pushUndo(textarea.value);
    textarea.value = JSON.stringify(DEFAULT_LINT_CONFIG, null, 2);
    saveLintConfig(DEFAULT_LINT_CONFIG);
    emit('workflow-lint:config-changed', {});
    errorArea.style.display = 'none';
  };

  actionRow.appendChild(captureBtn);
  actionRow.appendChild(resetBtn);

  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

  const lintBtn = createButton('Lint', true, colors);

  const close = () => {
    debouncedSave.cancel();
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };

  lintBtn.onclick = () => {
    try {
      const parsed = JSON.parse(textarea.value) as LintConfig;
      const { config: validated, errors } = validateLintConfig(parsed);
      if (errors.length > 0) {
        textarea.value = JSON.stringify(validated, null, 2);
      }
      saveLintConfig(validated);
      emit('workflow-lint:config-changed', {});
    } catch (error) {
      log.debug('Invalid JSON in lint config dialog', { error });
      errorArea.textContent = 'Invalid JSON \u2014 please fix syntax errors before linting';
      errorArea.style.display = 'block';
      return;
    }
    close();
    onLint();
  };

  buttonRow.appendChild(lintBtn);

  body.appendChild(textarea);
  body.appendChild(errorArea);
  body.appendChild(actionRow);
  body.appendChild(buttonRow);

  dialog.appendChild(header);
  dialog.appendChild(body);
  overlay.appendChild(dialog);

  closeBtn.onclick = close;
  overlay.onclick = (e) => e.target === overlay && close();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      const prev = undoStack.pop();
      if (prev) {
        e.preventDefault();
        pushUndo(textarea.value);
        textarea.value = prev;
        debouncedSave();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  document.body.appendChild(overlay);
  textarea.focus();
}

import { getThemeColors, logger, onThemeColorsChange } from '@/shared/utils';
import { icons } from '../icons';

const log = logger.child('show-password:injector');
export const MARKER_ATTR = 'data-xtend-password-toggle';

function createToggleButton(input: HTMLInputElement): HTMLSpanElement {
  const colors = getThemeColors();

  const suffix = document.createElement('span');
  suffix.className = 'el-input__suffix';
  suffix.style.cssText = `
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    pointer-events: auto;
    z-index: 1;
  `;

  const inner = document.createElement('span');
  inner.className = 'el-input__suffix-inner';
  inner.style.cssText = `
    display: flex;
    align-items: center;
  `;

  const button = document.createElement('span');
  button.className = 'el-input__icon';
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', 'Toggle password visibility');
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: pointer;
    color: ${colors.textMuted};
    transition: color 0.2s;
  `;
  button.innerHTML = icons.eye;

  let isVisible = false;
  let isHovered = false;
  let currentColors = colors;

  const updateButtonColor = () => {
    button.style.color = isHovered ? currentColors.brandPrimary : currentColors.textMuted;
  };

  const toggle = () => {
    isVisible = !isVisible;
    input.type = isVisible ? 'text' : 'password';
    button.innerHTML = isVisible ? icons.eyeOff : icons.eye;
    button.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
    log.debug(`Password visibility toggled: ${isVisible ? 'visible' : 'hidden'}`);
  };

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  button.addEventListener('mouseenter', () => {
    isHovered = true;
    updateButtonColor();
  });

  button.addEventListener('mouseleave', () => {
    isHovered = false;
    updateButtonColor();
  });

  const unsubscribeTheme = onThemeColorsChange((newColors) => {
    currentColors = newColors;
    updateButtonColor();
  });

  const removalObserver = new MutationObserver(() => {
    if (!document.contains(input)) {
      unsubscribeTheme();
      removalObserver.disconnect();
    }
  });
  removalObserver.observe(document.body, { childList: true, subtree: true });

  inner.appendChild(button);
  suffix.appendChild(inner);

  return suffix;
}

function findWrapper(input: HTMLInputElement): HTMLElement | null {
  const elInput = input.closest('.el-input') as HTMLElement | null;
  if (elInput) return elInput;

  const parent = input.parentElement;
  if (parent) return parent;

  return null;
}

export function injectToggle(input: HTMLInputElement): void {
  if (input.hasAttribute(MARKER_ATTR)) return;

  const wrapper = findWrapper(input);
  if (!wrapper) return;

  if (wrapper.querySelector('[data-xtend-toggle]')) return;

  const inputName = input.name || input.id || input.placeholder || 'unnamed';
  log.debug(`Injecting toggle for password input "${inputName}"`);

  input.setAttribute(MARKER_ATTR, 'true');
  input.style.paddingRight = '36px';

  if (getComputedStyle(wrapper).position === 'static') {
    log.debug('Setting wrapper position to relative');
    wrapper.style.position = 'relative';
  }

  const toggle = createToggleButton(input);
  toggle.setAttribute('data-xtend-toggle', 'true');

  const existingSuffix = wrapper.querySelector('.el-input__suffix');
  if (existingSuffix) {
    const existingInner = existingSuffix.querySelector('.el-input__suffix-inner');
    const toggleInner = toggle.querySelector('.el-input__suffix-inner');
    if (existingInner && toggleInner?.firstChild) {
      existingInner.appendChild(toggleInner.firstChild);
      log.debug('Appended toggle to existing suffix');
    }
  } else {
    wrapper.appendChild(toggle);
    log.debug('Created new suffix with toggle');
  }
}

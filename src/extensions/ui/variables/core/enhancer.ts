import { logger } from '@/shared/utils';

const log = logger.child('variables');

const USAGE_SYNTAX_SELECTOR = '.usageSyntax';
const ENHANCED_ATTR = 'data-n8n-xtend-enhanced';

function isWrapped(text: string): boolean {
  return text.startsWith('{{') && text.endsWith('}}');
}

function wrapWithBraces(text: string): string {
  if (isWrapped(text)) {
    return text;
  }
  return `{{ ${text} }}`;
}

function handleCopy(event: Event): void {
  const element = event.currentTarget as HTMLElement;
  const text = element.textContent?.trim() ?? '';

  if (!text) return;

  navigator.clipboard
    .writeText(text)
    .then(() => log.debug('Copied to clipboard', text))
    .catch((error) => log.debug('Failed to copy to clipboard', error));
}

function enhanceElement(element: HTMLElement): boolean {
  const currentText = element.textContent?.trim() ?? '';
  if (!currentText) return false;

  const hasAttr = element.hasAttribute(ENHANCED_ATTR);

  if (hasAttr && isWrapped(currentText)) {
    return false;
  }

  const rawText = hasAttr ? (element.getAttribute(ENHANCED_ATTR) ?? currentText) : currentText;

  element.textContent = wrapWithBraces(rawText);

  if (!hasAttr) {
    element.setAttribute(ENHANCED_ATTR, rawText);
    element.addEventListener('click', handleCopy);
  }

  return true;
}

export function enhanceUsageSyntax(): number {
  const elements = document.querySelectorAll<HTMLElement>(USAGE_SYNTAX_SELECTOR);
  let enhanced = 0;

  for (const element of elements) {
    if (enhanceElement(element)) {
      enhanced++;
    }
  }

  if (enhanced > 0) {
    log.debug(`Enhanced ${enhanced} syntax elements`);
  }

  return enhanced;
}

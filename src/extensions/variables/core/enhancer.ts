import { logger } from '@/shared/utils';

const log = logger.child('variables');

const USAGE_SYNTAX_SELECTOR = '.usageSyntax';
const ENHANCED_ATTR = 'data-n8n-xtend-enhanced';

function wrapWithBraces(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return trimmed;
  }
  return `{{ ${trimmed} }}`;
}

function enhanceElement(element: HTMLElement): void {
  if (element.hasAttribute(ENHANCED_ATTR)) {
    return;
  }

  const originalText = element.textContent?.trim() ?? '';
  if (!originalText) return;

  const enhancedText = wrapWithBraces(originalText);
  element.textContent = enhancedText;
  element.setAttribute(ENHANCED_ATTR, originalText);

  element.addEventListener('click', handleCopy);
}

function handleCopy(event: Event): void {
  const element = event.currentTarget as HTMLElement;
  const text = element.textContent?.trim() ?? '';

  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    log.debug('Copied to clipboard', text);
  });
}

export function enhanceUsageSyntax(): number {
  const elements = document.querySelectorAll<HTMLElement>(USAGE_SYNTAX_SELECTOR);
  let enhanced = 0;

  for (const element of elements) {
    if (!element.hasAttribute(ENHANCED_ATTR)) {
      enhanceElement(element);
      enhanced++;
    }
  }

  if (enhanced > 0) {
    log.debug(`Enhanced ${enhanced} syntax elements`);
  }

  return enhanced;
}

export function findElementBySelectors<T extends Element>(
  parent: Element | Document,
  selectors: string[],
): T | null {
  for (const selector of selectors) {
    const el = parent.querySelector(selector);
    if (el) {
      return el as T;
    }
  }
  return null;
}

export function findElementByClassPattern(
  parent: Element,
  patterns: readonly string[],
): Element | null {
  if (patterns.length === 0) {
    return null;
  }

  for (const pattern of patterns) {
    const element = parent.querySelector(`[class*="${pattern}"]`);
    if (element) {
      const className = element.className;
      if (typeof className === 'string' && className.includes(pattern)) {
        return element;
      }
    }
  }

  return null;
}

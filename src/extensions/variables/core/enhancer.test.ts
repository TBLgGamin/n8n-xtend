import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enhanceUsageSyntax } from './enhancer';

describe('enhanceUsageSyntax', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  it('returns 0 when no elements found', () => {
    document.body.innerHTML = '<div>No syntax elements</div>';

    const result = enhanceUsageSyntax();

    expect(result).toBe(0);
  });

  it('enhances single syntax element', () => {
    document.body.innerHTML = '<span class="usageSyntax">$vars.myVar</span>';

    const result = enhanceUsageSyntax();

    expect(result).toBe(1);
  });

  it('enhances multiple syntax elements', () => {
    document.body.innerHTML = `
      <span class="usageSyntax">$vars.var1</span>
      <span class="usageSyntax">$vars.var2</span>
      <span class="usageSyntax">$vars.var3</span>
    `;

    const result = enhanceUsageSyntax();

    expect(result).toBe(3);
  });

  it('wraps content with double braces', () => {
    document.body.innerHTML = '<span class="usageSyntax">$vars.myVar</span>';

    enhanceUsageSyntax();

    const element = document.querySelector('.usageSyntax');
    expect(element?.textContent).toBe('{{ $vars.myVar }}');
  });

  it('does not double-wrap already wrapped content', () => {
    document.body.innerHTML = '<span class="usageSyntax">{{ $vars.myVar }}</span>';

    enhanceUsageSyntax();

    const element = document.querySelector('.usageSyntax');
    expect(element?.textContent).toBe('{{ $vars.myVar }}');
  });

  it('sets data attribute on enhanced elements', () => {
    document.body.innerHTML = '<span class="usageSyntax">$vars.myVar</span>';

    enhanceUsageSyntax();

    const element = document.querySelector('.usageSyntax');
    expect(element?.getAttribute('data-n8n-xtend-enhanced')).toBe('$vars.myVar');
  });

  it('does not enhance already enhanced elements', () => {
    document.body.innerHTML =
      '<span class="usageSyntax" data-n8n-xtend-enhanced="$vars.myVar">{{ $vars.myVar }}</span>';

    const result = enhanceUsageSyntax();

    expect(result).toBe(0);
  });

  it('adds click handler for copy', () => {
    document.body.innerHTML = '<span class="usageSyntax">$vars.myVar</span>';

    enhanceUsageSyntax();

    const element = document.querySelector('.usageSyntax') as HTMLElement;
    element.click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{{ $vars.myVar }}');
  });

  it('trims whitespace from content', () => {
    document.body.innerHTML = '<span class="usageSyntax">  $vars.myVar  </span>';

    enhanceUsageSyntax();

    const element = document.querySelector('.usageSyntax');
    expect(element?.textContent).toBe('{{ $vars.myVar }}');
  });

  it('handles empty elements', () => {
    document.body.innerHTML = '<span class="usageSyntax"></span>';

    const result = enhanceUsageSyntax();

    expect(result).toBe(0);
  });

  it('handles whitespace-only elements', () => {
    document.body.innerHTML = '<span class="usageSyntax">   </span>';

    const result = enhanceUsageSyntax();

    expect(result).toBe(0);
  });

  it('preserves original text in data attribute', () => {
    document.body.innerHTML = '<span class="usageSyntax">$vars.original</span>';

    enhanceUsageSyntax();

    const element = document.querySelector('.usageSyntax');
    expect(element?.getAttribute('data-n8n-xtend-enhanced')).toBe('$vars.original');
  });

  it('counts only newly enhanced elements', () => {
    document.body.innerHTML = `
      <span class="usageSyntax">$vars.new1</span>
      <span class="usageSyntax" data-n8n-xtend-enhanced="$vars.old">{{ $vars.old }}</span>
      <span class="usageSyntax">$vars.new2</span>
    `;

    const result = enhanceUsageSyntax();

    expect(result).toBe(2);
  });
});

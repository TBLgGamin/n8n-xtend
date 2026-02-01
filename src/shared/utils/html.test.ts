import { describe, expect, it } from 'vitest';
import { escapeHtml } from './html';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes less than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes multiple special characters', () => {
    expect(escapeHtml('<div class="test">&</div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;',
    );
  });

  it('returns unchanged string when no special characters', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

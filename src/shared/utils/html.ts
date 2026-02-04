const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ESCAPE_REGEX = /[&<>"']/g;

export function escapeHtml(text: string): string {
  if (!HTML_ESCAPE_REGEX.test(text)) {
    return text;
  }

  HTML_ESCAPE_REGEX.lastIndex = 0;
  return text.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

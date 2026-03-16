import { escapeHtml } from '../shared/utils/html';

function processInline(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderTable(lines: string[]): string {
  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0] ?? '');
  const rows = lines.slice(2).map(parseRow);

  const ths = headers.map((h) => `<th>${processInline(escapeHtml(h))}</th>`).join('');
  const trs = rows
    .map((row) => {
      const tds = row.map((cell) => `<td>${processInline(escapeHtml(cell))}</td>`).join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function renderList(lines: string[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul';
  const items = lines
    .map((line) => {
      const text = ordered ? line.replace(/^\d+\.\s+/, '') : line.replace(/^[-*]\s+/, '');
      return `<li>${processInline(escapeHtml(text))}</li>`;
    })
    .join('');
  return `<${tag}>${items}</${tag}>`;
}

function escapeInlineText(text: string): string {
  return processInline(escapeHtml(text));
}

function parseHeading(line: string): string | null {
  if (line.startsWith('####')) return `<h4>${escapeInlineText(line.slice(4).trim())}</h4>`;
  if (line.startsWith('###')) return `<h3>${escapeInlineText(line.slice(3).trim())}</h3>`;
  if (line.startsWith('##')) return `<h2>${escapeInlineText(line.slice(2).trim())}</h2>`;
  if (line.startsWith('# ')) return `<h2>${escapeInlineText(line.slice(2).trim())}</h2>`;
  return null;
}

function collectWhile(
  lines: string[],
  start: number,
  predicate: (line: string) => boolean,
): { collected: string[]; end: number } {
  const collected: string[] = [];
  let idx = start;
  while (idx < lines.length && predicate(lines[idx] ?? '')) {
    collected.push(lines[idx] ?? '');
    idx++;
  }
  return { collected, end: idx };
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('#') ||
    line.startsWith('```') ||
    line.startsWith('|') ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^---+$/.test(line.trim())
  );
}

function parseCodeBlock(lines: string[], start: number): { html: string; end: number } {
  const lang = (lines[start] ?? '').slice(3).trim();
  const codeLines: string[] = [];
  let idx = start + 1;
  while (idx < lines.length && !(lines[idx] ?? '').startsWith('```')) {
    codeLines.push(lines[idx] ?? '');
    idx++;
  }
  const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
  const html = `<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
  return { html, end: idx + 1 };
}

function parseParagraph(lines: string[], start: number): { html: string; end: number } {
  const paraLines: string[] = [];
  let idx = start;
  while (
    idx < lines.length &&
    (lines[idx] ?? '').trim() !== '' &&
    !isBlockStart(lines[idx] ?? '')
  ) {
    paraLines.push(lines[idx] ?? '');
    idx++;
  }
  return { html: `<p>${escapeInlineText(paraLines.join(' '))}</p>`, end: idx };
}

function parseTableBlock(lines: string[], start: number): { html: string; end: number } {
  const result = collectWhile(lines, start, (l) => l.startsWith('|'));
  return { html: renderTable(result.collected), end: result.end };
}

function parseListBlock(
  lines: string[],
  start: number,
  ordered: boolean,
): { html: string; end: number } {
  const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
  const result = collectWhile(lines, start, (l) => pattern.test(l));
  return { html: renderList(result.collected, ordered), end: result.end };
}

function parseBlock(lines: string[], i: number): { html: string | null; end: number } {
  const line = lines[i] ?? '';

  if (line.trim() === '') return { html: null, end: i + 1 };
  if (line.startsWith('```')) return parseCodeBlock(lines, i);

  const heading = parseHeading(line);
  if (heading) return { html: heading, end: i + 1 };

  if (line.startsWith('|') && (lines[i + 1] ?? '').includes('---'))
    return parseTableBlock(lines, i);
  if (/^---+$/.test(line.trim())) return { html: '<hr>', end: i + 1 };
  if (/^[-*]\s+/.test(line)) return parseListBlock(lines, i, false);
  if (/^\d+\.\s+/.test(line)) return parseListBlock(lines, i, true);

  return parseParagraph(lines, i);
}

export function renderMarkdown(markdown: string): string {
  const blocks: string[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const result = parseBlock(lines, i);
    if (result.html) blocks.push(result.html);
    i = result.end;
  }

  return blocks.join('');
}

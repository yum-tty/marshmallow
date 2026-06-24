// parser.ts | Markdown tokenizer (glamour port)

export type TokenType =
  | 'heading'
  | 'paragraph'
  | 'blockquote'
  | 'code_fence'
  | 'code_block'
  | 'html_block'
  | 'thematic_break'
  | 'list_item'
  | 'ordered_list_item'
  | 'table'
  | 'table_row'
  | 'table_cell'
  | 'task_item'
  | 'task_checked'
  | 'task_unchecked'
  | 'text'
  | 'softbreak'
  | 'hardbreak'
  | 'strong'
  | 'em'
  | 'strikethrough'
  | 'codespan'
  | 'link'
  | 'image'
  | 'blank_line';

export interface Token {
  type: TokenType;
  content: string;
  level?: number;
  ordered?: boolean;
  tight?: boolean;
  checked?: boolean;
  indent?: number;
  children?: Token[];
  href?: string;
  title?: string;
  alt?: string;
  language?: string;
  alignment?: 'left' | 'center' | 'right' | 'none';
  startNumber?: number;
}

function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  if (/^[-*_]{3,}$/.test(trimmed) && !/^[-*_]+ [^]/.test(trimmed)) {
    const char = trimmed[0]!;
    return trimmed.split('').every(c => c === char || c === ' ');
  }
  return false;
}

function parseTableAlignment(sepLine: string): ('left' | 'center' | 'right' | 'none')[] {
  const cells = sepLine
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim());

  return cells.map(cell => {
    const leftColon = cell.startsWith(':');
    const rightColon = cell.endsWith(':');
    const dashes = cell.replace(/:/g, '');

    if (!/^[-]+$/.test(dashes)) return 'none';
    if (leftColon && rightColon) return 'center';
    if (rightColon) return 'right';
    return 'left';
  });
}

export function parseInlineTokens(text: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < text.length) {
    // Images: ![alt](url "title")
    const imgMatch = text.slice(pos).match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
    if (imgMatch) {
      tokens.push({
        type: 'image',
        content: imgMatch[1]!,
        alt: imgMatch[1],
        href: imgMatch[2],
        title: imgMatch[3],
      });
      pos += imgMatch[0].length;
      continue;
    }

    // Links: [text](url "title")
    const linkMatch = text.slice(pos).match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
    if (linkMatch) {
      tokens.push({
        type: 'link',
        content: linkMatch[1]!,
        href: linkMatch[2],
        title: linkMatch[3],
      });
      pos += linkMatch[0].length;
      continue;
    }

    // Code span: `code`
    const codeMatch = text.slice(pos).match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({
        type: 'codespan',
        content: codeMatch[1]!,
      });
      pos += codeMatch[0].length;
      continue;
    }

    // Strong: **text** or __text__
    const strongMatch = text.slice(pos).match(/^\*\*(.+?)\*\*|^__(.+?)__/);
    if (strongMatch) {
      tokens.push({
        type: 'strong',
        content: strongMatch[1] ?? strongMatch[2]!,
      });
      pos += strongMatch[0].length;
      continue;
    }

    // Emphasis: *text* or _text_
    const emMatch = text.slice(pos).match(/^\*(.+?)\*|^_(.+?)_/);
    if (emMatch) {
      tokens.push({
        type: 'em',
        content: emMatch[1] ?? emMatch[2]!,
      });
      pos += emMatch[0].length;
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = text.slice(pos).match(/^~~(.+?)~~/);
    if (strikeMatch) {
      tokens.push({
        type: 'strikethrough',
        content: strikeMatch[1]!,
      });
      pos += strikeMatch[0].length;
      continue;
    }

    // Hard break: two spaces at end of line or \
    if (text.slice(pos).startsWith('  \n')) {
      tokens.push({ type: 'hardbreak', content: '' });
      pos += 3;
      continue;
    }
    if (text.slice(pos).startsWith('\\\n')) {
      tokens.push({ type: 'hardbreak', content: '' });
      pos += 2;
      continue;
    }

    // Plain text - consume until next special character
    let end = text.length;
    for (const ch of ['!', '[', '`', '*', '_', '~']) {
      const idx = text.indexOf(ch, pos + 1);
      if (idx !== -1 && idx < end) {
        end = idx;
      }
    }

    const plain = text.slice(pos, end);
    if (plain) {
      tokens.push({ type: 'text', content: plain });
    }
    pos = end;
  }

  return tokens;
}

export function tokenize(markdown: string): Token[] {
  const lines = markdown.split('\n');
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Blank line
    if (line.trim() === '') {
      tokens.push({ type: 'blank_line', content: '' });
      i++;
      continue;
    }

    // Fenced code block: ``` or ~~~
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const fence = fenceMatch[1]!;
      const language = fenceMatch[2]!.trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i]!.trimStart().startsWith(fence.slice(0, 3)) && lines[i]!.trim().length <= fence.length + 3) {
          i++;
          break;
        }
        codeLines.push(lines[i]!);
        i++;
      }
      tokens.push({
        type: 'code_fence',
        content: codeLines.join('\n'),
        language: language || undefined,
      });
      continue;
    }

    // Indented code block (4 spaces or 1 tab)
    if (/^( {4}|\t)/.test(line)) {
      const codeLines: string[] = [];
      while (i < lines.length && (/^( {4}|\t)/.test(lines[i]!) || lines[i]!.trim() === '')) {
        codeLines.push(lines[i]!.replace(/^ {4}|^\t/, ''));
        i++;
      }
      tokens.push({
        type: 'code_block',
        content: codeLines.join('\n'),
      });
      continue;
    }

    // Heading: # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      tokens.push({
        type: 'heading',
        content: headingMatch[2]!,
        level: headingMatch[1]!.length,
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (isHorizontalRule(line)) {
      tokens.push({ type: 'thematic_break', content: '' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i]!.startsWith('>') || (lines[i]!.trim() !== '' && quoteLines.length > 0))) {
        if (lines[i]!.startsWith('>')) {
          const content = lines[i]!.replace(/^>\s?/, '');
          quoteLines.push(content);
        } else {
          quoteLines.push(lines[i]!);
        }
        i++;
        if (i < lines.length && lines[i]!.trim() === '') break;
      }
      const inner = quoteLines.join('\n');
      const innerTokens = tokenize(inner);
      tokens.push({
        type: 'blockquote',
        content: inner,
        children: innerTokens,
      });
      continue;
    }

    // Task list item: - [x] or - [ ]
    const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[3]!.toLowerCase() === 'x';
      const indent = taskMatch[1]!.length;
      tokens.push({
        type: checked ? 'task_checked' : 'task_unchecked',
        content: taskMatch[4]!,
        checked,
        indent,
      });
      i++;
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (ulMatch) {
      const indent = ulMatch[1]!.length;
      tokens.push({
        type: 'list_item',
        content: ulMatch[3]!,
        ordered: false,
        indent,
      });
      i++;
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const indent = olMatch[1]!.length;
      tokens.push({
        type: 'ordered_list_item',
        content: olMatch[3]!,
        ordered: true,
        indent,
        startNumber: parseInt(olMatch[2]!, 10),
      });
      i++;
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1]!)) {
      const headerCells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());

      const alignments = parseTableAlignment(lines[i + 1]!);
      const tableRows: Token[][] = [];

      // Header row
      tableRows.push(
        headerCells.map((cell, idx) => ({
          type: 'table_cell' as TokenType,
          content: cell,
          alignment: alignments[idx] ?? 'none' as const,
        }))
      );

      i += 2; // skip header and separator

      // Data rows
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim() !== '') {
        const rowLine = lines[i]!;
        const cells = rowLine
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim());

        tableRows.push(
          cells.map((cell, idx) => ({
            type: 'table_cell' as TokenType,
            content: cell,
            alignment: alignments[idx] ?? 'none' as const,
          }))
        );
        i++;
      }

      tokens.push({
        type: 'table',
        content: '',
        children: tableRows.map((row, rowIdx) => ({
          type: 'table_row' as TokenType,
          content: '',
          children: row,
          // First row is header
        })),
      });
      continue;
    }

    // HTML block (simple detection)
    if (/^<(div|p|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|pre|code|hr|br|img|blockquote)[\s>]/i.test(line)) {
      const htmlLines: string[] = [];
      const tagName = line.match(/^<(\w+)/)![1]!;
      const closingTag = `</${tagName}>`;
      while (i < lines.length) {
        htmlLines.push(lines[i]!);
        if (lines[i]!.includes(closingTag)) {
          i++;
          break;
        }
        i++;
      }
      tokens.push({
        type: 'html_block',
        content: htmlLines.join('\n'),
      });
      continue;
    }

    // Paragraph - collect consecutive non-empty lines
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !lines[i]!.startsWith('#') &&
      !lines[i]!.startsWith('>') &&
      !lines[i]!.startsWith('```') &&
      !lines[i]!.startsWith('~~~') &&
      !/^(`{3,}|~{3,})/.test(lines[i]!) &&
      !isHorizontalRule(lines[i]!) &&
      !/^(\s*)([-*+])\s+/.test(lines[i]!) &&
      !/^(\s*)(\d+)\.\s+/.test(lines[i]!) &&
      !/^\|?[\s\-:|]+\|?$/.test(lines[i]!) &&
      !/^( {4}|\t)/.test(lines[i]!)
    ) {
      paragraphLines.push(lines[i]!);
      i++;
      // If next line is blank, stop
      if (i < lines.length && lines[i]!.trim() === '') break;
      // If next line starts a block element, stop
      if (i < lines.length && (
        lines[i]!.startsWith('#') ||
        lines[i]!.startsWith('>') ||
        lines[i]!.startsWith('```') ||
        lines[i]!.startsWith('~~~') ||
        isHorizontalRule(lines[i]!) ||
        /^\|?[\s\-:|]+\|?$/.test(lines[i]!)
      )) break;
    }

    if (paragraphLines.length > 0) {
      tokens.push({
        type: 'paragraph',
        content: paragraphLines.join('\n'),
        children: parseInlineTokens(paragraphLines.join(' ')),
      });
    }
  }

  return tokens;
}

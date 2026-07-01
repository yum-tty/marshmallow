import { emojiMap } from "./emoji"

export type TokenType =
  | 'heading'
  | 'paragraph'
  | 'blockquote'
  | 'code_fence'
  | 'code_block'
  | 'html_block'
  | 'thematic_break'
  | 'list'
  | 'list_item'
  | 'ordered_list_item'
  | 'table'
  | 'table_row'
  | 'table_cell'
  | 'task_item'
  | 'task_checked'
  | 'task_unchecked'
  | 'definition_list'
  | 'definition_term'
  | 'definition_description'
  | 'footnote'
  | 'footnote_list'
  | 'footnote_link'
  | 'footnote_backlink'
  | 'ref_link'
  | 'ref_definition'
  | 'emoji'
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
  ref?: string;
  backref?: string;
}

function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  if (/^[-*_]{3,}$/.test(trimmed)) {
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

const emojiRegex = /:([a-zA-Z0-9_+-]+):/g

const languageAliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  cs: 'csharp',
  'c#': 'csharp',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  docker: 'dockerfile',
  'dockerfile': 'dockerfile',
  yml: 'yaml',
  toml: 'toml',
  json5: 'json',
  md: 'markdown',
  rs: 'rust',
  kt: 'kotlin',
  'kts': 'kotlin',
  fs: 'fsharp',
  'f#': 'fsharp',
  'objective-c': 'objectivec',
  'objc': 'objectivec',
  'c++': 'cpp',
  'c': 'c',
  go: 'go',
  java: 'java',
  php: 'php',
  swift: 'swift',
  sql: 'sql',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  graphql: 'graphql',
  gql: 'graphql',
  protobuf: 'protobuf',
  proto: 'protobuf',
  makefile: 'makefile',
  cmake: 'cmake',
  vim: 'vim',
  lua: 'lua',
  r: 'r',
  matlab: 'matlab',
  perl: 'perl',
  wasm: 'wasm',
  text: 'text',
  plaintext: 'text',
  'plain text': 'text',
}

function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim()
  return languageAliases[lower] ?? lower
}

function isListItem(t: Token): t is Token & { indent: number } {
  return t.type === 'list_item' || t.type === 'ordered_list_item' || t.type === 'task_checked' || t.type === 'task_unchecked'
}

function buildNestedListTokens(tokens: Token[]): Token[] {
  const result: Token[] = []
  let i = 0

  while (i < tokens.length) {
    if (!isListItem(tokens[i]!)) {
      result.push(tokens[i]!)
      i++
      continue
    }

    const listItems: { token: Token; indent: number; children: any[] }[] = []
    while (i < tokens.length && (isListItem(tokens[i]!) || (tokens[i]!.type === 'blank_line' && i + 1 < tokens.length && isListItem(tokens[i + 1]!)))) {
      if (tokens[i]!.type === 'blank_line') {
        i++
        continue
      }
      const item = tokens[i]!
      listItems.push({ token: item, indent: item.indent ?? 0, children: [] })
      i++
    }

    const root: any[] = []
    const stack: { indent: number; children: any[] }[] = [{ indent: -1, children: root }]

    for (const item of listItems) {
      while (stack.length > 1 && stack[stack.length - 1]!.indent >= item.indent) {
        stack.pop()
      }
      const entry = { ...item, children: [] }
      stack[stack.length - 1]!.children.push(entry)
      stack.push({ indent: item.indent, children: entry.children })
    }

    function toTokens(entries: any[]): Token[] {
      return entries.map((e: any) => {
        const children = toTokens(e.children)
        if (children.length > 0) {
          return { ...e.token, children }
        }
        return e.token
      })
    }

    const nestedItems = toTokens(root)
    const firstType = listItems[0]!.token.type
    const isOrdered = firstType === 'ordered_list_item'

    result.push({
      type: 'list',
      content: '',
      ordered: isOrdered,
      children: nestedItems,
    })
  }

  return result
}

function resolveRefLinks(tokens: Token[], refDefs: Map<string, { href: string; title?: string }>): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === 'ref_link') {
      const def = refDefs.get(t.ref!.toLowerCase());
      if (def) {
        tokens[i] = {
          type: 'link',
          content: t.content,
          href: def.href,
          title: def.title,
        };
      }
    }
    if (t.children) {
      resolveRefLinks(t.children, refDefs);
    }
  }
}

export function parseInlineTokens(text: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < text.length) {
    const rest = text.slice(pos);

    const imgMatch = rest.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
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

    const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
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

    const refLinkMatch = rest.match(/^\[([^\]]+)\]\[([^\]]*)\]/);
    if (refLinkMatch) {
      const linkContent = refLinkMatch[1]!;
      const refId = refLinkMatch[2] || linkContent;
      tokens.push({
        type: 'ref_link',
        content: linkContent,
        ref: refId,
      });
      pos += refLinkMatch[0].length;
      continue;
    }

    const shorthandRefMatch = rest.match(/^\[([^\]]+)\](?!\(|\[)/);
    if (shorthandRefMatch) {
      tokens.push({
        type: 'ref_link',
        content: shorthandRefMatch[1]!,
        ref: shorthandRefMatch[1]!,
      });
      pos += shorthandRefMatch[0].length;
      continue;
    }

    const footnoteLinkMatch = rest.match(/^\[\^([^\]]+)\]/);
    if (footnoteLinkMatch) {
      const ref = footnoteLinkMatch[1]!;
      if (text.slice(pos + footnoteLinkMatch[0].length).startsWith(':')) {
        pos += footnoteLinkMatch[0].length + 1;
        continue;
      }
      tokens.push({
        type: 'footnote_link',
        content: ref,
        ref,
      });
      pos += footnoteLinkMatch[0].length;
      continue;
    }

    const codeMatch = rest.match(/^(`+)(\s*)(.*?)(\s*)\1(?!`)/s);
    if (codeMatch) {
      let content = codeMatch[3]!;
      if (codeMatch[2] || codeMatch[4]) {
        content = codeMatch[2] + content + codeMatch[4];
      }
      tokens.push({
        type: 'codespan',
        content,
      });
      pos += codeMatch[0].length;
      continue;
    }

    const strongMatch = rest.match(/^\*\*(.+?)\*\*|^__(.+?)__/);
    if (strongMatch) {
      tokens.push({
        type: 'strong',
        content: strongMatch[1] ?? strongMatch[2]!,
      });
      pos += strongMatch[0].length;
      continue;
    }

    const emMatch = rest.match(/^\*(.+?)\*|^_(.+?)_/);
    if (emMatch) {
      tokens.push({
        type: 'em',
        content: emMatch[1] ?? emMatch[2]!,
      });
      pos += emMatch[0].length;
      continue;
    }

    const strikeMatch = rest.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      tokens.push({
        type: 'strikethrough',
        content: strikeMatch[1]!,
      });
      pos += strikeMatch[0].length;
      continue;
    }

    const emojiMatch = rest.match(/^:([a-zA-Z0-9_+-]+):/);
    if (emojiMatch) {
      const code = emojiMatch[1]!;
      const unicode = emojiMap[code];
      if (unicode) {
        tokens.push({
          type: 'emoji',
          content: unicode,
        });
        pos += emojiMatch[0].length;
        continue;
      }
    }

    if (rest.startsWith('  \n')) {
      tokens.push({ type: 'hardbreak', content: '' });
      pos += 3;
      continue;
    }
    if (rest.startsWith('\\\n')) {
      tokens.push({ type: 'hardbreak', content: '' });
      pos += 2;
      continue;
    }

    if (rest.startsWith('\\') && pos + 1 < text.length) {
      const nextChar = text[pos + 1]!;
      if (nextChar === '*' || nextChar === '_' || nextChar === '[' || nextChar === ']' || nextChar === '(' || nextChar === ')' || nextChar === '\\' || nextChar === '`' || nextChar === '#' || nextChar === '+' || nextChar === '-' || nextChar === '.' || nextChar === '!' || nextChar === '|' || nextChar === '<' || nextChar === '>' || nextChar === '~' || nextChar === '^' || nextChar === '{' || nextChar === '}') {
        tokens.push({ type: 'text', content: nextChar });
        pos += 2;
        continue;
      }
    }

    let end = text.length;
    for (const ch of ['!', '[', '`', '*', '_', '~', ':']) {
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
  let footnoteCounter = 0;
  const footnoteDefs: Map<string, { content: string; number: number }> = new Map();
  const refDefs: Map<string, { href: string; title?: string }> = new Map();

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === '') {
      tokens.push({ type: 'blank_line', content: '' });
      i++;
      continue;
    }

    const refDefMatch = line.match(/^\[([^\]]+)\]:\s+<?(\S+)>?\s*(?:"([^"]*)")?$/);
    if (refDefMatch) {
      const refId = refDefMatch[1]!.toLowerCase();
      refDefs.set(refId, {
        href: refDefMatch[2]!,
        title: refDefMatch[3] || undefined,
      });
      i++;
      continue;
    }

    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const fence = fenceMatch[1]!;
      const rawLanguage = fenceMatch[2]!.trim();
      const language = rawLanguage ? normalizeLanguage(rawLanguage) : undefined;
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
        language,
      });
      continue;
    }

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

    if (isHorizontalRule(line)) {
      tokens.push({ type: 'thematic_break', content: '' });
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i]!.startsWith('>') || (lines[i]!.trim() !== '' && quoteLines.length > 0))) {
        if (lines[i]!.startsWith('>')) {
          const stripped = lines[i]!.replace(/^>\s?/, '');
          quoteLines.push(stripped);
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

    const footnoteDefMatch = line.match(/^\[\^([^\]]+)\]:\s+(.*)$/);
    if (footnoteDefMatch) {
      const ref = footnoteDefMatch[1]!;
      const content = footnoteDefMatch[2]!;
      footnoteCounter++;
      footnoteDefs.set(ref, { content, number: footnoteCounter });
      i++;
      continue;
    }

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

    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1]!)) {
      const headerCells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());

      const alignments = parseTableAlignment(lines[i + 1]!);
      const tableRows: Token[][] = [];

      tableRows.push(
        headerCells.map((cell, idx) => ({
          type: 'table_cell' as TokenType,
          content: cell,
          alignment: alignments[idx] ?? 'none' as const,
        }))
      );

      i += 2;

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
        })),
      });
      continue;
    }

    const dlTermMatch = line.match(/^([^:]\S.*)(?=\s*$)/);
    const nextLine = i + 1 < lines.length ? lines[i + 1]! : '';
    if (dlTermMatch && /^:\s+/.test(nextLine)) {
      const defTokens: Token[] = [];
      defTokens.push({
        type: 'definition_term',
        content: dlTermMatch[1]!,
      });
      i++;
      while (i < lines.length && /^:\s+/.test(lines[i]!)) {
        const defContent = lines[i]!.replace(/^:\s+/, '');
        const descChildren: string[] = [defContent];
        i++;
        while (i < lines.length && lines[i]!.trim() !== '' && !/^:\s+/.test(lines[i]!) && !/^([^:]\S.*)(?=\s*$)/.test(lines[i]!) && !isHorizontalRule(lines[i]!)) {
          if (/^(\s*)([-*+])\s+/.test(lines[i]!) || /^(\s*)(\d+)\.\s+/.test(lines[i]!)) break;
          if (/^#{1,6}\s+/.test(lines[i]!)) break;
          if (lines[i]!.startsWith('>')) break;
          if (/^(`{3,}|~{3,})/.test(lines[i]!)) break;
          if (/^\|/.test(lines[i]!)) break;
          descChildren.push(lines[i]!.trim());
          i++;
        }
        const joined = descChildren.join(' ');
        defTokens.push({
          type: 'definition_description',
          content: joined,
          children: parseInlineTokens(joined),
        });
      }
      tokens.push({
        type: 'definition_list',
        content: '',
        children: defTokens,
      });
      continue;
    }

    if (/^<!--/.test(line)) {
      const htmlLines: string[] = [];
      while (i < lines.length) {
        htmlLines.push(lines[i]!);
        if (lines[i]!.includes('-->')) {
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

    if (/^<(div|p|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|pre|code|hr|br|img|blockquote|dl|dt|dd|details|summary|section|article|nav|header|footer|aside|figure|figcaption|main)[\s>\/]/i.test(line) || /^<\w+[\s>\/]/i.test(line)) {
      const htmlLines: string[] = [];
      const tagMatch = line.match(/^<(\w+)/);
      if (!tagMatch) {
        tokens.push({ type: 'html_block', content: line });
        i++;
        continue;
      }
      const tagName = tagMatch[1]!;
      if (/\/\s*>$/.test(line) || /^(<\s*(?:hr|br|img|input|meta|link)\b)/i.test(line)) {
        tokens.push({ type: 'html_block', content: line });
        i++;
        continue;
      }
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
      !/^( {4}|\t)/.test(lines[i]!) &&
      !/^\[\^[^\]]+\]:/.test(lines[i]!)
    ) {
      paragraphLines.push(lines[i]!);
      i++;
      if (i < lines.length && lines[i]!.trim() === '') break;
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

  if (footnoteDefs.size > 0) {
    const footnoteTokens: Token[] = [];
    const sortedDefs = [...footnoteDefs.entries()].sort((a, b) => a[1].number - b[1].number);
    for (const [ref, def] of sortedDefs) {
      footnoteTokens.push({
        type: 'footnote',
        content: def.content,
        ref,
        backref: `${def.number}`,
        children: parseInlineTokens(def.content),
      });
    }
    tokens.push({
      type: 'footnote_list',
      content: '',
      children: footnoteTokens,
    });
  }

  if (refDefs.size > 0) {
    resolveRefLinks(tokens, refDefs);
  }

  return buildNestedListTokens(tokens);
}

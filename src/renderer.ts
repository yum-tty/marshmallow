// renderer.ts | markdown renderer (glamour port)

import { Style, NewStyle } from "caramel"
import { tokenize, type Token, parseInlineTokens } from "./parser"

export interface StyleConfig {
  document: Style
  blockquote: Style
  heading: Style[]
  hr: Style
  link: Style
  linkText: Style
  emphasis: Style
  strong: Style
  strikethrough: Style
  code: Style
  codeBlock: Style
  list: Style
  listItem: Style
  orderedListItem: Style
  taskItem: Style
  table: Style
  tableHeader: Style
  tableCell: Style
  paragraph: Style
  h1: Style
  h2: Style
  h3: Style
  h4: Style
  h5: Style
  h6: Style
}

export const darkStyle: StyleConfig = {
  document: NewStyle(),
  blockquote: NewStyle().foreground("#666666"),
  heading: [
    NewStyle().bold(true).foreground("#FFFFFF"),
    NewStyle().bold(true).foreground("#FFFFFF"),
    NewStyle().bold(true).foreground("#FFFFFF"),
    NewStyle().bold(true).foreground("#FFFFFF"),
    NewStyle().bold(true).foreground("#FFFFFF"),
    NewStyle().bold(true).foreground("#FFFFFF"),
  ],
  hr: NewStyle().foreground("#666666"),
  link: NewStyle().foreground("#5FD7FF"),
  linkText: NewStyle().foreground("#5FD7FF"),
  emphasis: NewStyle().italic(true),
  strong: NewStyle().bold(true),
  strikethrough: NewStyle().strikethrough(true),
  code: NewStyle().foreground("#FF5F5F").background("#1A1A1A"),
  codeBlock: NewStyle().foreground("#FF5F5F").background("#1A1A1A"),
  list: NewStyle(),
  listItem: NewStyle(),
  orderedListItem: NewStyle(),
  taskItem: NewStyle(),
  table: NewStyle(),
  tableHeader: NewStyle().bold(true),
  tableCell: NewStyle(),
  paragraph: NewStyle(),
  h1: NewStyle().bold(true).foreground("#FFFFFF").background("#3F00FF"),
  h2: NewStyle().bold(true).foreground("#FFFFFF"),
  h3: NewStyle().bold(true).foreground("#FFFFFF"),
  h4: NewStyle().bold(true).foreground("#FFFFFF"),
  h5: NewStyle().bold(true).foreground("#FFFFFF"),
  h6: NewStyle().bold(true).foreground("#23A123"),
}

export const lightStyle: StyleConfig = {
  document: NewStyle(),
  blockquote: NewStyle().foreground("#999999"),
  heading: [
    NewStyle().bold(true).foreground("#000000"),
    NewStyle().bold(true).foreground("#000000"),
    NewStyle().bold(true).foreground("#000000"),
    NewStyle().bold(true).foreground("#000000"),
    NewStyle().bold(true).foreground("#000000"),
    NewStyle().bold(true).foreground("#000000"),
  ],
  hr: NewStyle().foreground("#999999"),
  link: NewStyle().foreground("#0066CC"),
  linkText: NewStyle().foreground("#0066CC"),
  emphasis: NewStyle().italic(true),
  strong: NewStyle().bold(true),
  strikethrough: NewStyle().strikethrough(true),
  code: NewStyle().foreground("#CC0000").background("#F5F5F5"),
  codeBlock: NewStyle().foreground("#CC0000").background("#F5F5F5"),
  list: NewStyle(),
  listItem: NewStyle(),
  orderedListItem: NewStyle(),
  taskItem: NewStyle(),
  table: NewStyle(),
  tableHeader: NewStyle().bold(true),
  tableCell: NewStyle(),
  paragraph: NewStyle(),
  h1: NewStyle().bold(true).foreground("#000000"),
  h2: NewStyle().bold(true).foreground("#000000"),
  h3: NewStyle().bold(true).foreground("#000000"),
  h4: NewStyle().bold(true).foreground("#000000"),
  h5: NewStyle().bold(true).foreground("#000000"),
  h6: NewStyle().bold(true).foreground("#000000"),
}

export const asciiStyle: StyleConfig = {
  document: NewStyle(),
  blockquote: NewStyle(),
  heading: [
    NewStyle().bold(true),
    NewStyle().bold(true),
    NewStyle().bold(true),
    NewStyle().bold(true),
    NewStyle().bold(true),
    NewStyle().bold(true),
  ],
  hr: NewStyle(),
  link: NewStyle(),
  linkText: NewStyle(),
  emphasis: NewStyle().italic(true),
  strong: NewStyle().bold(true),
  strikethrough: NewStyle().strikethrough(true),
  code: NewStyle(),
  codeBlock: NewStyle(),
  list: NewStyle(),
  listItem: NewStyle(),
  orderedListItem: NewStyle(),
  taskItem: NewStyle(),
  table: NewStyle(),
  tableHeader: NewStyle().bold(true),
  tableCell: NewStyle(),
  paragraph: NewStyle(),
  h1: NewStyle().bold(true),
  h2: NewStyle().bold(true),
  h3: NewStyle().bold(true),
  h4: NewStyle().bold(true),
  h5: NewStyle().bold(true),
  h6: NewStyle().bold(true),
}

export const nottyStyle: StyleConfig = asciiStyle

export const pinkStyle: StyleConfig = {
  document: NewStyle(),
  blockquote: NewStyle().foreground("#D4A5A5"),
  heading: [
    NewStyle().bold(true).foreground("#FF69B4"),
    NewStyle().bold(true).foreground("#FF69B4"),
    NewStyle().bold(true).foreground("#FF69B4"),
    NewStyle().bold(true).foreground("#FF69B4"),
    NewStyle().bold(true).foreground("#FF69B4"),
    NewStyle().bold(true).foreground("#FF69B4"),
  ],
  hr: NewStyle().foreground("#FF69B4"),
  link: NewStyle().foreground("#6366F1"),
  linkText: NewStyle().foreground("#EC4899").bold(true),
  emphasis: NewStyle().italic(true).foreground("#F9A8D4"),
  strong: NewStyle().bold(true).foreground("#FF69B4"),
  strikethrough: NewStyle().strikethrough(true),
  code: NewStyle().foreground("#FF69B4").background("#2D1B2E"),
  codeBlock: NewStyle().foreground("#FF69B4").background("#2D1B2E"),
  list: NewStyle(),
  listItem: NewStyle(),
  orderedListItem: NewStyle().foreground("#9F7AEA"),
  taskItem: NewStyle(),
  table: NewStyle(),
  tableHeader: NewStyle().bold(true).foreground("#FF69B4"),
  tableCell: NewStyle(),
  paragraph: NewStyle(),
  h1: NewStyle().bold(true).foreground("#FF69B4"),
  h2: NewStyle().bold(true).foreground("#FF69B4"),
  h3: NewStyle().bold(true).foreground("#FF69B4"),
  h4: NewStyle().bold(true).foreground("#FF69B4"),
  h5: NewStyle().bold(true).foreground("#FF69B4"),
  h6: NewStyle().foreground("#D4A5A5"),
}

export const draculaStyle: StyleConfig = {
  document: NewStyle().foreground("#F8F8F2"),
  blockquote: NewStyle().foreground("#F1FA8C").italic(true),
  heading: [
    NewStyle().bold(true).foreground("#BD93F9"),
    NewStyle().bold(true).foreground("#BD93F9"),
    NewStyle().bold(true).foreground("#BD93F9"),
    NewStyle().bold(true).foreground("#BD93F9"),
    NewStyle().bold(true).foreground("#BD93F9"),
    NewStyle().bold(true).foreground("#BD93F9"),
  ],
  hr: NewStyle().foreground("#6272A4"),
  link: NewStyle().foreground("#8BE9FD").underline(true),
  linkText: NewStyle().foreground("#FF79C6"),
  emphasis: NewStyle().italic(true).foreground("#F1FA8C"),
  strong: NewStyle().bold(true).foreground("#FFB86C"),
  strikethrough: NewStyle().strikethrough(true),
  code: NewStyle().foreground("#50FA7B"),
  codeBlock: NewStyle().foreground("#FFB86C"),
  list: NewStyle().foreground("#F8F8F2"),
  listItem: NewStyle(),
  orderedListItem: NewStyle().foreground("#8BE9FD"),
  taskItem: NewStyle(),
  table: NewStyle(),
  tableHeader: NewStyle().bold(true).foreground("#BD93F9"),
  tableCell: NewStyle(),
  paragraph: NewStyle(),
  h1: NewStyle().bold(true).foreground("#BD93F9"),
  h2: NewStyle().bold(true).foreground("#BD93F9"),
  h3: NewStyle().bold(true).foreground("#BD93F9"),
  h4: NewStyle().bold(true).foreground("#BD93F9"),
  h5: NewStyle().bold(true).foreground("#BD93F9"),
  h6: NewStyle().bold(true).foreground("#BD93F9"),
}

export const tokyoNightStyle: StyleConfig = {
  document: NewStyle().foreground("#A9B1D6"),
  blockquote: NewStyle().foreground("#565F89"),
  heading: [
    NewStyle().bold(true).foreground("#BB9AF7"),
    NewStyle().bold(true).foreground("#BB9AF7"),
    NewStyle().bold(true).foreground("#BB9AF7"),
    NewStyle().bold(true).foreground("#BB9AF7"),
    NewStyle().bold(true).foreground("#BB9AF7"),
    NewStyle().bold(true).foreground("#BB9AF7"),
  ],
  hr: NewStyle().foreground("#565F89"),
  link: NewStyle().foreground("#7AA2F7").underline(true),
  linkText: NewStyle().foreground("#2AC3DE"),
  emphasis: NewStyle().italic(true),
  strong: NewStyle().bold(true),
  strikethrough: NewStyle().strikethrough(true),
  code: NewStyle().foreground("#9ECE6A"),
  codeBlock: NewStyle().foreground("#FF9E64"),
  list: NewStyle().foreground("#A9B1D6"),
  listItem: NewStyle(),
  orderedListItem: NewStyle().foreground("#7AA2F7"),
  taskItem: NewStyle(),
  table: NewStyle(),
  tableHeader: NewStyle().bold(true).foreground("#BB9AF7"),
  tableCell: NewStyle(),
  paragraph: NewStyle(),
  h1: NewStyle().bold(true).foreground("#BB9AF7"),
  h2: NewStyle().bold(true).foreground("#BB9AF7"),
  h3: NewStyle().bold(true).foreground("#BB9AF7"),
  h4: NewStyle().bold(true).foreground("#BB9AF7"),
  h5: NewStyle().bold(true).foreground("#BB9AF7"),
  h6: NewStyle().bold(true).foreground("#BB9AF7"),
}

export interface RendererConfig {
  width?: number
  style?: StyleConfig
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

function visibleLength(str: string): number {
  return stripAnsi(str).length
}

function padRight(str: string, targetLen: number): string {
  const vis = visibleLength(str)
  if (vis >= targetLen) return str
  return str + ' '.repeat(targetLen - vis)
}

function padLeft(str: string, targetLen: number): string {
  const vis = visibleLength(str)
  if (vis >= targetLen) return str
  return ' '.repeat(targetLen - vis) + str
}

function padCenter(str: string, targetLen: number): string {
  const vis = visibleLength(str)
  if (vis >= targetLen) return str
  const totalPad = targetLen - vis
  const left = Math.floor(totalPad / 2)
  const right = totalPad - left
  return ' '.repeat(left) + str + ' '.repeat(right)
}

function wordWrap(str: string, maxWidth: number): string {
  if (maxWidth <= 0) return str
  const lines = str.split('\n')
  const result: string[] = []

  for (const line of lines) {
    if (visibleLength(line) <= maxWidth) {
      result.push(line)
      continue
    }

    const words = line.split(' ')
    let currentLine = ''

    for (const word of words) {
      if (currentLine && visibleLength(currentLine + ' ' + word) > maxWidth) {
        result.push(currentLine)
        currentLine = word
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word
      }
    }

    if (currentLine) result.push(currentLine)
  }

  return result.join('\n')
}

export class Renderer {
  private width: number
  private style: StyleConfig

  constructor(config: RendererConfig = {}) {
    this.width = config.width ?? 80
    this.style = config.style ?? darkStyle
  }

  render(markdown: string): string {
    const tokens = tokenize(markdown)
    const result: string[] = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!
      const rendered = this.renderToken(token)
      if (rendered !== null) {
        result.push(rendered)
      }
    }

    return result.join('\n')
  }

  private renderToken(token: Token): string | null {
    switch (token.type) {
      case 'heading':
        return this.renderHeading(token)
      case 'paragraph':
        return this.renderParagraph(token)
      case 'blockquote':
        return this.renderBlockquote(token)
      case 'code_fence':
      case 'code_block':
        return this.renderCodeBlock(token)
      case 'thematic_break':
        return this.renderHorizontalRule(token)
      case 'list_item':
      case 'ordered_list_item':
        return this.renderListItem(token)
      case 'task_checked':
      case 'task_unchecked':
        return this.renderTaskItem(token)
      case 'table':
        return this.renderTable(token)
      case 'html_block':
        return token.content
      case 'blank_line':
        return ''
      default:
        return null
    }
  }

  private renderHeading(token: Token): string {
    const level = (token.level ?? 1) - 1
    const headingStyle = this.style.heading[Math.min(level, 5)]!
    const prefix = `#${' '.repeat(token.level ?? 1)} `
    return headingStyle.render(prefix + token.content)
  }

  private renderParagraph(token: Token): string {
    const text = token.children
      ? this.renderInlineTokens(token.children)
      : token.content
    const wrapped = wordWrap(text, this.width)
    return this.style.paragraph.render(wrapped)
  }

  private renderBlockquote(token: Token): string {
    const lines: string[] = []
    if (token.children) {
      for (const child of token.children) {
        const rendered = this.renderToken(child)
        if (rendered !== null) {
          const childLines = rendered.split('\n')
          for (const line of childLines) {
            lines.push(this.style.blockquote.render('│ ' + line))
          }
        }
      }
    }
    return lines.join('\n')
  }

  private renderCodeBlock(token: Token): string {
    const codeLines = token.content.split('\n')
    const maxLineLen = Math.max(...codeLines.map(l => l.length), 0)
    const langLabel = token.language ? ` ${token.language} ` : ''
    const border = '─'.repeat(maxLineLen + 2)

    const result: string[] = []
    result.push(this.style.codeBlock.render('┌' + border + '┐'))

    if (langLabel) {
      result.push(this.style.codeBlock.render('│ ' + this.style.code.render(langLabel) + ' '.repeat(maxLineLen - langLabel.length + 1) + '│'))
    }

    for (const line of codeLines) {
      const padded = line.padEnd(maxLineLen)
      result.push(this.style.codeBlock.render('│ ' + padded + ' │'))
    }

    result.push(this.style.codeBlock.render('└' + border + '┘'))
    return result.join('\n')
  }

  private renderHorizontalRule(_token: Token): string {
    return this.style.hr.render('--------')
  }

  private renderListItem(token: Token): string {
    const indent = '  '.repeat(Math.floor((token.indent ?? 0) / 2))
    let marker: string
    if (token.ordered) {
      marker = this.style.orderedListItem.render(`${token.startNumber ?? 1}. `)
    } else {
      marker = this.style.listItem.render('• ')
    }
    const text = this.renderInlineContent(token.content)
    return `${indent}${marker}${text}`
  }

  private renderTaskItem(token: Token): string {
    const indent = '  '.repeat(Math.floor((token.indent ?? 0) / 2))
    const checkbox = token.checked ? '[✓] ' : '[ ] '
    const text = this.renderInlineContent(token.content)
    return `${indent}${this.style.taskItem.render(checkbox)}${text}`
  }

  renderTable(token: Token): string {
    const rows = token.children ?? []
    if (rows.length === 0) return ''

    const allCells: string[][] = []
    for (const row of rows) {
      const rowCells: string[] = []
      for (const cell of row.children ?? []) {
        rowCells.push(cell.content)
      }
      allCells.push(rowCells)
    }

    const colCount = Math.max(...allCells.map(r => r.length))
    const colWidths: number[] = Array(colCount).fill(0)

    for (const row of allCells) {
      for (let c = 0; c < colCount; c++) {
        const cellVis = visibleLength(row[c] ?? '')
        if (cellVis > colWidths[c]!) {
          colWidths[c] = cellVis
        }
      }
    }

    const alignments: ('left' | 'center' | 'right' | 'none')[] = []
    if (rows.length > 0 && rows[0]!.children) {
      for (const cell of rows[0]!.children!) {
        alignments.push(cell.alignment ?? 'none')
      }
    }

    const sepLine = colWidths.map(w => '─'.repeat(w + 2)).join('┼')
    const result: string[] = []

    for (let r = 0; r < allCells.length; r++) {
      const row = allCells[r]!
      const cells: string[] = []

      for (let c = 0; c < colCount; c++) {
        const cellText = row[c] ?? ''
        const align = alignments[c] ?? 'none'
        const padded = align === 'center'
          ? padCenter(cellText, colWidths[c]!)
          : align === 'right'
          ? padLeft(cellText, colWidths[c]!)
          : padRight(cellText, colWidths[c]!)
        cells.push(' ' + padded + ' ')
      }

      const rowStr = cells.join('│')
      if (r === 0) {
        result.push(this.style.tableHeader.render('│' + rowStr + '│'))
        result.push(this.style.table.render(sepLine))
      } else {
        result.push(this.style.tableCell.render('│' + rowStr + '│'))
      }
    }

    return result.join('\n')
  }

  renderInlineContent(text: string): string {
    const inlineTokens = parseInlineTokens(text)
    return this.renderInlineTokens(inlineTokens)
  }

  renderInlineTokens(tokens: Token[]): string {
    let result = ''

    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          result += token.content
          break
        case 'strong':
          result += this.style.strong.render(token.content)
          break
        case 'em':
          result += this.style.emphasis.render(token.content)
          break
        case 'strikethrough':
          result += this.style.strikethrough.render(token.content)
          break
        case 'codespan':
          result += this.style.code.render(token.content)
          break
        case 'link':
          result += this.style.linkText.render(token.content)
          result += ' '
          result += this.style.link.render(`(${token.href})`)
          break
        case 'image':
          result += this.style.linkText.render(`Image: ${token.alt ?? token.content}`)
          result += ' → '
          result += this.style.link.render(token.href ?? '')
          break
        case 'hardbreak':
          result += '\n'
          break
        case 'softbreak':
          result += ' '
          break
        default:
          result += token.content
          break
      }
    }

    return result
  }

  setWidth(width: number): void {
    this.width = width
  }

  setStyle(style: StyleConfig): void {
    this.style = style
  }
}

export function NewRenderer(config?: RendererConfig): Renderer {
  return new Renderer(config)
}

export function Render(markdown: string, config?: RendererConfig): string {
  const renderer = new Renderer(config)
  return renderer.render(markdown)
}

export function RenderWithStyle(markdown: string, style: StyleConfig): string {
  const renderer = new Renderer({ style })
  return renderer.render(markdown)
}

declare const process: { env: Record<string, string | undefined> }

import { Style, NewStyle } from "caramel"
import { tokenize, type Token, parseInlineTokens } from "./parser"

function htmlUnescape(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function getStringWidth(str: string): number {
  let width = 0
  let inEscape = false
  for (const char of str) {
    if (char === "\x1b") { inEscape = true; continue }
    if (inEscape) { if (char === "m") inEscape = false; continue }
    const code = char.codePointAt(0)!
    width += (code >= 0x1100 && code <= 0x115F) || (code >= 0x2329 && code <= 0x232A) ||
      (code >= 0x2E80 && code <= 0x303E) || (code >= 0x3040 && code <= 0x33BF) ||
      (code >= 0x3400 && code <= 0x4DBF) || (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0xA000 && code <= 0xA4CF) || (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) || (code >= 0xFE10 && code <= 0xFE19) ||
      (code >= 0xFE30 && code <= 0xFE6F) || (code >= 0xFF00 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) || (code >= 0x20000 && code <= 0x2FFFD) ||
      (code >= 0x30000 && code <= 0x3FFFD) ? 2 : 1
  }
  return width
}

function ansiWrap(str: string, width: number): string {
  if (width <= 0) return str
  const lines = str.split("\n")
  const result: string[] = []
  for (const line of lines) {
    if (getStringWidth(line) <= width) { result.push(line); continue }
    const words = line.split(/(?<=[,.;\-+|]) /)
    let currentLine = ""
    let currentWidth = 0
    for (const word of words) {
      const wordWidth = getStringWidth(word)
      const spaceWidth = currentLine ? 1 : 0
      if (currentWidth + spaceWidth + wordWidth > width && currentLine) {
        result.push(currentLine)
        currentLine = word
        currentWidth = wordWidth
      } else {
        currentLine = currentLine ? currentLine + " " + word : word
        currentWidth += spaceWidth + wordWidth
      }
    }
    if (currentLine) result.push(currentLine)
  }
  return result.join("\n")
}
import {
  type StylePrimitive,
  type StyleBlock,
  type StyleTask,
  type StyleCodeBlock,
  type StyleList,
  type StyleTable,
  type StyleConfig,
  cascadeStyle,
  cascadeStyles,
  cascadeStylePrimitives,
  styleToCaramel,
  renderText,
  formatToken,
  defaultStyleConfig,
} from "./style"

export type { StylePrimitive, StyleBlock, StyleTask, StyleCodeBlock, StyleList, StyleTable, StyleConfig }
export { cascadeStyle, cascadeStyles, cascadeStylePrimitives, renderText, formatToken, defaultStyleConfig }

const defaultWidth = 80

interface BlockStackEntry {
  block: string
  style: StyleBlock
  margin: boolean
  newline: boolean
}

class BlockStack {
  private entries: BlockStackEntry[] = []

  len(): number { return this.entries.length }

  push(e: BlockStackEntry): void { this.entries.push(e) }

  pop(): void { this.entries.pop() }

  current(): BlockStackEntry {
    if (this.entries.length === 0) {
      return { block: "", style: {}, margin: false, newline: false }
    }
    return this.entries[this.entries.length - 1]!
  }

  parent(): BlockStackEntry {
    if (this.entries.length <= 1) {
      return { block: "", style: {}, margin: false, newline: false }
    }
    return this.entries[this.entries.length - 2]!
  }

  indent(): number {
    let i = 0
    for (const v of this.entries) {
      if (v.style.indent != null) i += v.style.indent
    }
    return i
  }

  margin(): number {
    let m = 0
    for (const v of this.entries) {
      if (v.style.margin != null) m += v.style.margin
    }
    return m
  }

  width(options: Options): number {
    const indent = this.indent()
    const m = this.margin()
    const total = indent + m * 2
    if (total > options.wordWrap) return 0
    return options.wordWrap - total
  }

  with(child: StylePrimitive): StylePrimitive {
    const sb: StyleBlock = { ...child }
    return cascadeStyle(this.current().style, sb, false)
  }
}

function applyMargin(content: string, width: number, rules: StyleBlock, blockStyle: StyleBlock): string {
  const indent = rules.indent ?? 0
  const margin = rules.margin ?? 0
  const indentToken = rules.indentToken ?? " "

  const lines = content.split("\n")
  const result: string[] = []

  for (const line of lines) {
    let padded = line
    const lineW = getStringWidth(line)
    if (margin > 0 && lineW < margin) {
      padded = padded + " ".repeat(margin - lineW)
    }
    const prefix = indentToken.repeat(indent + margin)
    result.push(prefix + padded)
  }

  return result.join("\n")
}

export function makeHyperlink(link: string): [string, string, boolean] {
  try {
    const url = new URL(link)
    if ("#" + url.hash === link) return ["", "", false]
    const id = `id=${simpleHash(link)}`
    return [`\x1b]8;;${link}\x07`, `\x1b]8;;\x07`, true]
  } catch {
    if (link.startsWith("#")) return ["", "", false]
    const id = `id=${simpleHash(link)}`
    return [`\x1b]8;;${link}\x07`, `\x1b]8;;\x07`, true]
  }
}

function simpleHash(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function resolveRelativeURL(baseURL: string, rel: string): string {
  try {
    const u = new URL(rel)
    return rel
  } catch {
    if (!baseURL) return rel
    try {
      return new URL(rel, baseURL).toString()
    } catch {
      return rel
    }
  }
}

export interface Options {
  baseURL: string
  wordWrap: number
  tableWrap: boolean | null
  inlineTableLinks: boolean
  preserveNewLines: boolean
  styles: StyleConfig
  chromaFormatter: string
}

function defaultOptions(): Options {
  return {
    baseURL: "",
    wordWrap: defaultWidth,
    tableWrap: null,
    inlineTableLinks: false,
    preserveNewLines: false,
    styles: deepCopyStyleConfig(defaultStyleConfig),
    chromaFormatter: "",
  }
}

function deepCopyStyleConfig(src: StyleConfig): StyleConfig {
  return JSON.parse(JSON.stringify(src))
}

export type TermRendererOption = (tr: TermRenderer) => void

export function WithBaseURL(baseURL: string): TermRendererOption {
  return (tr) => { tr.options.baseURL = baseURL }
}

export function WithStandardStyle(style: string): TermRendererOption {
  return (tr) => {
    const s = getNamedStyle(style)
    if (s) tr.options.styles = deepCopyStyleConfig(s)
  }
}

export function WithEnvironmentConfig(): TermRendererOption {
  return WithStylePath(getEnvironmentStyle())
}

export function WithStylePath(stylePath: string): TermRendererOption {
  return (tr) => {
    const s = getNamedStyle(stylePath)
    if (s) {
      tr.options.styles = deepCopyStyleConfig(s)
    }
  }
}

export function WithStyles(styles: StyleConfig): TermRendererOption {
  return (tr) => { tr.options.styles = styles }
}

export function WithStylesFromJSONBytes(jsonBytes: string): TermRendererOption {
  return (tr) => {
    const parsed = JSON.parse(jsonBytes) as Partial<StyleConfig>
    Object.assign(tr.options.styles, parsed)
  }
}

export function WithStylesFromJSONFile(_filename: string): TermRendererOption {
  return (_tr) => {
    // File I/O requires async context; use WithStylesFromJSONBytes for sync usage
  }
}

export function WithWordWrap(wordWrap: number): TermRendererOption {
  return (tr) => { tr.options.wordWrap = wordWrap }
}

export function WithTableWrap(tableWrap: boolean): TermRendererOption {
  return (tr) => { tr.options.tableWrap = tableWrap }
}

export function WithInlineTableLinks(inlineTableLinks: boolean): TermRendererOption {
  return (tr) => { tr.options.inlineTableLinks = inlineTableLinks }
}

export function WithPreservedNewLines(): TermRendererOption {
  return (tr) => { tr.options.preserveNewLines = true }
}

export function WithEmoji(): TermRendererOption {
  return () => {}
}

export function WithChromaFormatter(formatter: string): TermRendererOption {
  return (tr) => { tr.options.chromaFormatter = formatter }
}

export function WithOptions(...options: TermRendererOption[]): TermRendererOption {
  return (tr) => {
    for (const o of options) o(tr)
  }
}

export function getEnvironmentStyle(): string {
  try {
    return process.env.Glamour_STYLE ?? process.env.GLAMOUR_STYLE ?? "dark"
  } catch {
    return "dark"
  }
}

function getNamedStyle(name: string): StyleConfig | null {
  const map: Record<string, StyleConfig> = {
    ascii: asciiStyle,
    dark: darkStyle,
    light: lightStyle,
    notty: nottyStyle,
    pink: pinkStyle,
    dracula: draculaStyle,
    "tokyo-night": tokyoNightStyle,
    "tokyo_night": tokyoNightStyle,
  }
  return map[name] ?? null
}

interface RenderContext {
  options: Options
  blockStack: BlockStack
  tableLinks: TableLink[]
  tableImages: TableLink[]
  footnotes: Token[]
  footnoteMap: Map<string, number>
}

interface TableLink {
  href: string
  title: string
  content: string
  linkType: number
}

const LINK_TYPE_AUTO = 1
const LINK_TYPE_IMAGE = 2
const LINK_TYPE_REGULAR = 3

export class TermRenderer {
  options: Options

  constructor(options?: Options) {
    this.options = options ? { ...options } : defaultOptions()
  }

  render(in_: string): string {
    const ctx: RenderContext = {
      options: this.options,
      blockStack: new BlockStack(),
      tableLinks: [],
      tableImages: [],
      footnotes: [],
      footnoteMap: new Map(),
    }

    ctx.blockStack.push({
      block: "",
      style: ctx.options.styles.document,
      margin: false,
      newline: false,
    })

    const tokens = tokenize(in_)

    let footnoteIdx = 0
    for (const t of tokens) {
      if (t.type === "footnote_list") {
        ctx.footnotes = t.children ?? []
        for (let fi = 0; fi < ctx.footnotes.length; fi++) {
          const fn = ctx.footnotes[fi]!
          if (fn.ref) ctx.footnoteMap.set(fn.ref, fi + 1)
        }
      }
    }

    const result: string[] = []

    for (let idx = 0; idx < tokens.length; idx++) {
      const token = tokens[idx]!
      if (token.type === "footnote_list") continue
      const rendered = this.renderToken(token, ctx)
      if (rendered !== null) {
        result.push(rendered)
      }
    }

    if (ctx.footnotes.length > 0) {
      const rendered = this.renderFootnoteList(ctx)
      if (rendered) result.push(rendered)
    }

    ctx.blockStack.pop()
    return result.join("\n")
  }

  private renderToken(token: Token, ctx: RenderContext): string | null {
    switch (token.type) {
      case 'heading': return this.renderHeading(token, ctx)
      case 'paragraph': return this.renderParagraph(token, ctx)
      case 'blockquote': return this.renderBlockquote(token, ctx)
      case 'code_fence':
      case 'code_block': return this.renderCodeBlock(token, ctx)
      case 'thematic_break': return this.renderHorizontalRule(token, ctx)
      case 'list_item':
      case 'ordered_list_item': return this.renderListItem(token, ctx)
      case 'task_checked':
      case 'task_unchecked': return this.renderTaskItem(token, ctx)
      case 'table': return this.renderTable(token, ctx)
      case 'definition_list': return this.renderDefinitionList(token, ctx)
      case 'definition_term': return this.renderDefinitionTerm(token, ctx)
      case 'definition_description': return this.renderDefinitionDescription(token, ctx)
      case 'footnote': return this.renderFootnote(token, ctx)
      case 'footnote_link': return this.renderFootnoteLink(token, ctx)
      case 'footnote_backlink': return this.renderFootnoteBacklink(token, ctx)
      case 'html_block': return token.content.replace(/<[^>]+>/g, '')
      case 'blank_line': return ''
      default: return null
    }
  }

  private renderHeading(token: Token, ctx: RenderContext): string {
    const level = (token.level ?? 1)
    const s = ctx.options.styles
    let rules = s.heading
    switch (level) {
      case 1: rules = cascadeStyles(s.heading, s.h1); break
      case 2: rules = cascadeStyles(s.heading, s.h2); break
      case 3: rules = cascadeStyles(s.heading, s.h3); break
      case 4: rules = cascadeStyles(s.heading, s.h4); break
      case 5: rules = cascadeStyles(s.heading, s.h5); break
      case 6: rules = cascadeStyles(s.heading, s.h6); break
    }

    const cs = ctx.blockStack.current()
    const parentStyle = cs.style
    const cascaded = cascadeStyle(parentStyle, rules, false)

    const text = htmlUnescape(token.content)
    let result = "\n"
    if (rules.blockPrefix) result += renderText(rules.blockPrefix, parentStyle)
    const styled = styleToCaramel(cascaded).render(rules.prefix + text + (rules.suffix ?? ""))
    result += styled
    if (rules.blockSuffix) result += renderText(rules.blockSuffix, cascaded)

    return result
  }

  private renderParagraph(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.paragraph
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const text = token.children
      ? this.renderInlineTokens(token.children, ctx)
      : htmlUnescape(token.content)

    let content = text
    if (!ctx.options.preserveNewLines) {
      content = content.replace(/\n/g, " ")
    }

    const width = ctx.blockStack.width(ctx.options)
    const wrapped = width > 0 ? ansiWrap(content, width) : content

    let result = ""
    if (rules.blockPrefix) result += renderText(rules.blockPrefix, cs.style)
    result += styleToCaramel(cascaded).render(wrapped)
    if (rules.blockSuffix) result += renderText(rules.blockSuffix, cascaded)
    result += "\n"

    return result
  }

  private renderBlockquote(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.blockquote
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const childResults: string[] = []
    if (token.children) {
      for (const child of token.children) {
        const rendered = this.renderToken(child, ctx)
        if (rendered !== null) {
          childResults.push(rendered)
        }
      }
    }

    const inner = childResults.join("\n")
    const indent = rules.indent ?? 1
    const indentToken = rules.indentToken ?? "│ "
    const lines = inner.split("\n")
    const prefixed = lines.map(l => {
      const prefix = renderText(indentToken, cascaded)
      return prefix + l
    })

    let result = ""
    if (rules.blockPrefix) result += renderText(rules.blockPrefix, cs.style)
    result += prefixed.join("\n")
    if (rules.blockSuffix) result += renderText(rules.blockSuffix, cascaded)

    return result
  }

  private renderCodeBlock(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.codeBlock
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const codeLines = token.content.split("\n")
    const maxLineLen = Math.max(...codeLines.map(l => getStringWidth(l)), 0)
    const langLabel = token.language ? ` ${token.language} ` : ''
    const border = '─'.repeat(maxLineLen + 2)

    const codeStyle = styleToCaramel(cascaded)
    const result: string[] = []
    result.push(codeStyle.render('┌' + border + '┐'))

    if (langLabel) {
      const labelStyle = styleToCaramel(s.code)
      result.push(codeStyle.render('│ ' + labelStyle.render(langLabel) + ' '.repeat(maxLineLen - getStringWidth(langLabel) + 1) + '│'))
    }

    for (const line of codeLines) {
      const padded = line.padEnd(maxLineLen)
      result.push(codeStyle.render('│ ' + padded + ' │'))
    }

    result.push(codeStyle.render('└' + border + '┘'))
    return result.join("\n")
  }

  private renderHorizontalRule(_token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.horizontalRule
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    let format = rules.format ?? "\n--------\n"
    return renderText(format, cascaded)
  }

  private renderListItem(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const cs = ctx.blockStack.current()
    const levelIndent = s.list.levelIndent ?? 4

    const indent = ' '.repeat(Math.floor((token.indent ?? 0) / levelIndent) * levelIndent)
    let marker: string
    if (token.ordered) {
      marker = renderText(`${token.startNumber ?? 1}. `, cascadeStyle(cs.style, s.enumeration, false))
    } else {
      marker = renderText(s.item.blockPrefix ?? "• ", cascadeStyle(cs.style, s.item, false))
    }
    const text = this.renderInlineContent(token.content, ctx)
    return `${indent}${marker}${text}`
  }

  private renderTaskItem(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const cs = ctx.blockStack.current()
    const taskRules = s.task
    const levelIndent = s.list.levelIndent ?? 4

    const indent = ' '.repeat(Math.floor((token.indent ?? 0) / levelIndent) * levelIndent)
    const checkbox = token.checked ? (taskRules.ticked ?? "[✓] ") : (taskRules.unticked ?? "[ ] ")
    const text = this.renderInlineContent(token.content, ctx)
    return `${indent}${renderText(checkbox, cascadeStyle(cs.style, taskRules, false))}${text}`
  }

  private renderTable(token: Token, ctx: RenderContext): string {
    const rows = token.children ?? []
    if (rows.length === 0) return ''

    const allCells: string[][] = []
    for (const row of rows) {
      const rowCells: string[] = []
      for (const cell of row.children ?? []) {
        const parsed = parseInlineTokens(htmlUnescape(cell.content))
        rowCells.push(this.renderInlineTokens(parsed, ctx))
      }
      allCells.push(rowCells)
    }

    const colCount = Math.max(...allCells.map(r => r.length))
    const colWidths: number[] = Array(colCount).fill(0)

    for (const row of allCells) {
      for (let c = 0; c < colCount; c++) {
        const cellVis = getStringWidth(row[c] ?? '')
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

    const tableRules = ctx.options.styles.table
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, tableRules, false)

    const centerSep = tableRules.centerSeparator ?? "┼"
    const colSep = tableRules.columnSeparator ?? "│"
    const rowSep = tableRules.rowSeparator ?? "─"

    const sepLine = colWidths.map(w => rowSep.repeat(w + 2)).join(centerSep)
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

      const rowStr = cells.join(colSep)
      if (r === 0) {
        const headerStyle = cascadeStyle(cascaded, ctx.options.styles.strong, false)
        result.push(styleToCaramel(headerStyle).render(colSep + rowStr + colSep))
        result.push(styleToCaramel(cascaded).render(sepLine))
      } else {
        result.push(styleToCaramel(cascaded).render(colSep + rowStr + colSep))
      }
    }

    return result.join("\n")
  }

  private renderDefinitionList(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.definitionList
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const parts: string[] = []
    if (token.children) {
      for (const child of token.children) {
        const rendered = this.renderToken(child, ctx)
        if (rendered !== null) parts.push(rendered)
      }
    }

    return styleToCaramel(cascaded).render(parts.join("\n"))
  }

  private renderDefinitionTerm(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.definitionTerm
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    return styleToCaramel(cascaded).render(token.content)
  }

  private renderDefinitionDescription(token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.definitionDescription
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const text = token.children
      ? this.renderInlineTokens(token.children, ctx)
      : token.content

    let result = ""
    if (rules.blockPrefix) result += renderText(rules.blockPrefix, cascaded)
    result += styleToCaramel(cascaded).render(text)
    if (rules.blockSuffix) result += renderText(rules.blockSuffix, cascaded)
    return result
  }

  private renderFootnote(token: Token, ctx: RenderContext): string {
    const num = token.backref ?? "?"
    const text = token.children
      ? this.renderInlineTokens(token.children, ctx)
      : token.content
    return `[${num}]: ${text}`
  }

  private renderFootnoteLink(token: Token, ctx: RenderContext): string {
    const ref = token.ref ?? token.content
    const num = ctx.footnoteMap.get(ref)
    if (num == null) return `[^${ref}]`

    const s = ctx.options.styles
    const rules = s.footnoteLink
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const hyperlink = `\x1b]8;;#user-content-${ref}\x07`
    const reset = `\x1b]8;;\x07`

    return styleToCaramel(cascaded).render(hyperlink + `${num}` + reset)
  }

  private renderFootnoteBacklink(token: Token, ctx: RenderContext): string {
    const ref = token.ref ?? token.content
    const s = ctx.options.styles
    const rules = s.footnoteBacklink
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const hyperlink = `\x1b]8;;#user-content-${ref}\x07`
    const reset = `\x1b]8;;\x07`

    return styleToCaramel(cascaded).render(hyperlink + "↩" + reset)
  }

  private renderFootnoteList(ctx: RenderContext): string {
    if (ctx.footnotes.length === 0) return ""

    const s = ctx.options.styles
    const rules = s.footnoteList
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const parts: string[] = []
    for (const fn of ctx.footnotes) {
      const num = fn.backref ?? "?"
      const text = fn.children
        ? this.renderInlineTokens(fn.children, ctx)
        : fn.content
      parts.push(`${num}. ${text}`)
    }

    let result = "\n"
    if (rules.blockPrefix) result += renderText(rules.blockPrefix, cascaded)
    result += parts.join("\n")
    if (rules.blockSuffix) result += renderText(rules.blockSuffix, cascaded)
    return result
  }

  private renderInlineContent(text: string, ctx: RenderContext): string {
    const inlineTokens = parseInlineTokens(htmlUnescape(text))
    return this.renderInlineTokens(inlineTokens, ctx)
  }

  private renderInlineTokens(tokens: Token[], ctx: RenderContext): string {
    let result = ''
    const s = ctx.options.styles
    const cs = ctx.blockStack.current()

    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          result += htmlUnescape(token.content)
          break
        case 'strong': {
          const style = cascadeStyle(cs.style, s.strong, false)
          result += styleToCaramel(style).render(token.content)
          break
        }
        case 'em': {
          const style = cascadeStyle(cs.style, s.emph, false)
          result += styleToCaramel(style).render(token.content)
          break
        }
        case 'strikethrough': {
          const style = cascadeStyle(cs.style, s.strikethrough, false)
          result += styleToCaramel(style).render(token.content)
          break
        }
        case 'codespan': {
          const style = cascadeStyle(cs.style, s.code, false)
          const prefix = s.code.prefix ?? ""
          const suffix = s.code.suffix ?? ""
          result += styleToCaramel(style).render(prefix + token.content + suffix)
          break
        }
        case 'link': {
          const hyperlink = makeHyperlink(token.href ?? "")
          const linkText = token.content

          const textStyle = cascadeStyle(cs.style, s.linkText, false)

          result += styleToCaramel(textStyle).render(hyperlink[0] + linkText + hyperlink[1])
          break
        }
        case 'image': {
          const url = token.href ?? ""
          const hyperlink = makeHyperlink(url)
          const text = token.alt ?? token.content ?? ""
          const resolved = resolveRelativeURL(ctx.options.baseURL, url)

          const imageTextRules = s.imageText
          const imageTextFormat = imageTextRules.format ?? "Image: {{.text}} →"
          const formattedText = formatToken(imageTextFormat, text)

          const textStyle = cascadeStyle(cs.style, imageTextRules, false)
          const urlStyle = cascadeStyle(cs.style, s.image, false)

          if (hyperlink[2]) {
            if (text) {
              result += styleToCaramel(textStyle).render(hyperlink[0] + formattedText + hyperlink[1])
            }
            result += " "
            result += styleToCaramel(urlStyle).render(hyperlink[0] + resolved + hyperlink[1])
          } else {
            if (text) {
              result += styleToCaramel(textStyle).render(formattedText)
            }
          }
          break
        }
        case 'hardbreak':
          result += '\n'
          break
        case 'softbreak':
          result += ' '
          break
        case 'footnote_link': {
          const ref = token.ref ?? token.content
          const num = ctx.footnoteMap.get(ref)
          if (num != null) {
            const hyperlink = `\x1b]8;;#user-content-${ref}\x07`
            const reset = `\x1b]8;;\x07`
            result += styleToCaramel(cs.style).render(hyperlink + `${num}` + reset)
          } else {
            result += `[^${ref}]`
          }
          break
        }
        case 'emoji':
          result += token.content
          break
        default:
          result += token.content ?? ""
          break
      }
    }

    return result
  }

  setWidth(width: number): void {
    this.options.wordWrap = width
  }

  setStyle(style: StyleConfig): void {
    this.options.styles = style
  }
}

function padRight(str: string, targetLen: number): string {
  const vis = getStringWidth(str)
  if (vis >= targetLen) return str
  return str + ' '.repeat(targetLen - vis)
}

function padLeft(str: string, targetLen: number): string {
  const vis = getStringWidth(str)
  if (vis >= targetLen) return str
  return ' '.repeat(targetLen - vis) + str
}

function padCenter(str: string, targetLen: number): string {
  const vis = getStringWidth(str)
  if (vis >= targetLen) return str
  const totalPad = targetLen - vis
  const left = Math.floor(totalPad / 2)
  const right = totalPad - left
  return ' '.repeat(left) + str + ' '.repeat(right)
}

const defaultImageFormat = "Image: {{.text}} →"

function mapStyleConfig(src: Record<string, any>): StyleConfig {
  const dst = deepCopyStyleConfig(defaultStyleConfig)

  function mapBlock(obj: any): StyleBlock {
    if (!obj) return {}
    const b: StyleBlock = {}
    if (obj.BlockPrefix != null) b.blockPrefix = obj.BlockPrefix
    if (obj.BlockSuffix != null) b.blockSuffix = obj.BlockSuffix
    if (obj.Prefix != null) b.prefix = obj.Prefix
    if (obj.Suffix != null) b.suffix = obj.Suffix
    if (obj.Color != null) b.color = obj.Color
    if (obj.BackgroundColor != null) b.backgroundColor = obj.BackgroundColor
    if (obj.Underline != null) b.underline = obj.Underline
    if (obj.Bold != null) b.bold = obj.Bold
    if (obj.Italic != null) b.italic = obj.Italic
    if (obj.CrossedOut != null) b.crossedOut = obj.CrossedOut
    if (obj.Faint != null) b.faint = obj.Faint
    if (obj.Inverse != null) b.inverse = obj.Inverse
    if (obj.Blink != null) b.blink = obj.Blink
    if (obj.Indent != null) b.indent = obj.Indent
    if (obj.IndentToken != null) b.indentToken = obj.IndentToken
    if (obj.Margin != null) b.margin = obj.Margin
    if (obj.Format != null) b.format = obj.Format
    return b
  }

  function mapPrimitive(obj: any): StylePrimitive {
    if (!obj) return {}
    const p: StylePrimitive = {}
    if (obj.BlockPrefix != null) p.blockPrefix = obj.BlockPrefix
    if (obj.BlockSuffix != null) p.blockSuffix = obj.BlockSuffix
    if (obj.Prefix != null) p.prefix = obj.Prefix
    if (obj.Suffix != null) p.suffix = obj.Suffix
    if (obj.Color != null) p.color = obj.Color
    if (obj.BackgroundColor != null) p.backgroundColor = obj.BackgroundColor
    if (obj.Underline != null) p.underline = obj.Underline
    if (obj.Bold != null) p.bold = obj.Bold
    if (obj.Italic != null) p.italic = obj.Italic
    if (obj.CrossedOut != null) p.crossedOut = obj.CrossedOut
    if (obj.Faint != null) p.faint = obj.Faint
    if (obj.Inverse != null) p.inverse = obj.Inverse
    if (obj.Blink != null) p.blink = obj.Blink
    if (obj.Format != null) p.format = obj.Format
    return p
  }

  if (src.document) dst.document = mapBlock(src.document)
  if (src.block_quote) dst.blockquote = mapBlock(src.block_quote)
  if (src.paragraph) dst.paragraph = mapBlock(src.paragraph)
  if (src.heading) dst.heading = mapBlock(src.heading)
  if (src.h1) dst.h1 = mapBlock(src.h1)
  if (src.h2) dst.h2 = mapBlock(src.h2)
  if (src.h3) dst.h3 = mapBlock(src.h3)
  if (src.h4) dst.h4 = mapBlock(src.h4)
  if (src.h5) dst.h5 = mapBlock(src.h5)
  if (src.h6) dst.h6 = mapBlock(src.h6)
  if (src.text) dst.text = mapPrimitive(src.text)
  if (src.strikethrough) dst.strikethrough = mapPrimitive(src.strikethrough)
  if (src.emph) dst.emph = mapPrimitive(src.emph)
  if (src.strong) dst.strong = mapPrimitive(src.strong)
  if (src.hr) dst.horizontalRule = mapPrimitive(src.hr)
  if (src.item) dst.item = mapPrimitive(src.item)
  if (src.enumeration) dst.enumeration = mapPrimitive(src.enumeration)
  if (src.link) dst.link = mapPrimitive(src.link)
  if (src.link_text) dst.linkText = mapPrimitive(src.link_text)
  if (src.image) dst.image = mapPrimitive(src.image)
  if (src.image_text) dst.imageText = mapPrimitive(src.image_text)
  if (src.code) dst.code = mapBlock(src.code)
  if (src.code_block) {
    const cb = mapBlock(src.code_block)
    dst.codeBlock = { ...cb, theme: src.code_block.Theme }
  }
  if (src.definition_list) dst.definitionList = mapBlock(src.definition_list)
  if (src.definition_term) dst.definitionTerm = mapPrimitive(src.definition_term)
  if (src.definition_description) dst.definitionDescription = mapPrimitive(src.definition_description)
  if (src.html_block) dst.htmlBlock = mapBlock(src.html_block)
  if (src.html_span) dst.htmlSpan = mapBlock(src.html_span)
  if (src.list) {
    const l = mapBlock(src.list)
    dst.list = { ...l, levelIndent: src.list.LevelIndent }
  }
  if (src.table) {
    const t = mapBlock(src.table)
    dst.table = {
      ...t,
      centerSeparator: src.table.CenterSeparator,
      columnSeparator: src.table.ColumnSeparator,
      rowSeparator: src.table.RowSeparator,
    }
  }
  if (src.task) {
    const tp = mapPrimitive(src.task)
    dst.task = {
      ...tp,
      ticked: src.task.Ticked,
      unticked: src.task.Unticked,
    }
  }

  return dst
}

export const darkStyle: StyleConfig = deepCopyStyleConfig(defaultStyleConfig)

export const lightStyle: StyleConfig = (() => {
  const s = deepCopyStyleConfig(defaultStyleConfig)
  s.document.color = "234"
  s.heading.color = "27"
  s.h6.bold = false
  s.horizontalRule.color = "249"
  s.link.color = "36"
  s.linkText.color = "29"
  s.image.color = "205"
  s.imageText.color = "243"
  s.code.color = "203"
  s.code.backgroundColor = "254"
  s.codeBlock.color = "242"
  return s
})()

export const asciiStyle: StyleConfig = (() => {
  const s = deepCopyStyleConfig(defaultStyleConfig)
  s.document.blockPrefix = "\n"
  s.document.blockSuffix = "\n"
  s.document.margin = 2
  s.blockquote.indent = 1
  s.blockquote.indentToken = "| "
  s.heading.blockSuffix = "\n"
  s.heading.color = undefined
  s.heading.bold = undefined
  s.h1.prefix = "# "
  s.h2.prefix = "## "
  s.h3.prefix = "### "
  s.h4.prefix = "#### "
  s.h5.prefix = "##### "
  s.h6.prefix = "###### "
  s.h1.color = undefined
  s.h1.backgroundColor = undefined
  s.h1.bold = undefined
  s.h2.color = undefined
  s.h3.color = undefined
  s.h4.color = undefined
  s.h5.color = undefined
  s.h6.color = undefined
  s.strikethrough = { crossedOut: true }
  s.emph = { italic: true }
  s.strong = { bold: true }
  s.horizontalRule = { format: "\n--------\n" }
  s.item = { blockPrefix: "• " }
  s.enumeration = { blockPrefix: ". " }
  s.link = {}
  s.linkText = {}
  s.image = {}
  s.imageText = { format: defaultImageFormat }
  s.code = {}
  s.codeBlock = { margin: 2 }
  s.table = {}
  s.definitionDescription = { blockPrefix: "\n* " }
  return s
})()

export const nottyStyle: StyleConfig = asciiStyle

export const pinkStyle: StyleConfig = (() => {
  const s = deepCopyStyleConfig(defaultStyleConfig)
  s.document.margin = 2
  s.blockquote.indent = 1
  s.blockquote.indentToken = "│ "
  s.heading.color = "212"
  s.h1.blockSuffix = "\n"
  s.h1.blockPrefix = "\n"
  s.h1.prefix = ""
  s.h2.prefix = "▌ "
  s.h3.prefix = "┃ "
  s.h4.prefix = "│ "
  s.h5.prefix = "┆ "
  s.h6.prefix = "┊ "
  s.h6.bold = false
  s.horizontalRule = { color: "212", format: "\n──────\n" }
  s.link.color = "99"
  s.linkText.bold = true
  s.image.underline = true
  s.imageText.format = "Image: {{.text}}"
  s.code.color = "212"
  s.code.backgroundColor = "236"
  s.definitionDescription = { blockPrefix: "\n🠶 " }
  return s
})()

export const draculaStyle: StyleConfig = (() => {
  const s = deepCopyStyleConfig(defaultStyleConfig)
  s.document.color = "252"
  s.blockquote.color = "228"
  s.blockquote.italic = true
  s.heading.color = "99"
  s.h1.color = "99"
  s.h2.color = "99"
  s.h3.color = "99"
  s.h4.color = "99"
  s.h5.color = "99"
  s.h6.color = "99"
  s.horizontalRule.color = "61"
  s.link.color = "117"
  s.link.underline = true
  s.linkText.color = "212"
  s.emph = { italic: true, color: "228" }
  s.strong = { bold: true, color: "215" }
  s.strikethrough = { crossedOut: true }
  s.code.color = "84"
  s.codeBlock.color = "215"
  s.list.color = "252"
  s.enumeration.color = "117"
  s.table.color = "99"
  s.h6.bold = false
  return s
})()

export const tokyoNightStyle: StyleConfig = (() => {
  const s = deepCopyStyleConfig(defaultStyleConfig)
  s.document.color = "140"
  s.blockquote.color = "61"
  s.heading.color = "141"
  s.h1.color = "141"
  s.h2.color = "141"
  s.h3.color = "141"
  s.h4.color = "141"
  s.h5.color = "141"
  s.h6.color = "141"
  s.horizontalRule.color = "61"
  s.link.color = "110"
  s.link.underline = true
  s.linkText.color = "74"
  s.strikethrough = { crossedOut: true }
  s.code.color = "108"
  s.codeBlock.color = "209"
  s.list.color = "140"
  s.enumeration.color = "110"
  s.table.color = "141"
  s.h6.bold = false
  return s
})()

export interface RendererConfig {
  width?: number
  style?: StyleConfig
}

export class Renderer {
  private renderer: TermRenderer

  constructor(config: RendererConfig = {}) {
    const opts = defaultOptions()
    if (config.width != null) opts.wordWrap = config.width
    if (config.style != null) opts.styles = config.style
    this.renderer = new TermRenderer(opts)
  }

  render(markdown: string): string {
    return this.renderer.render(markdown)
  }

  setWidth(width: number): void {
    this.renderer.options.wordWrap = width
  }

  setStyle(style: StyleConfig): void {
    this.renderer.options.styles = style
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

export function RenderWithEnvironmentConfig(markdown: string): string {
  const styleName = getEnvironmentStyle()
  const style = getNamedStyle(styleName) ?? defaultStyleConfig
  const renderer = new Renderer({ style })
  return renderer.render(markdown)
}

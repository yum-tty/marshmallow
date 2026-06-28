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

function sanitizeHtml(s: string, trimSpaces: boolean): string {
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
  s = s.replace(/<embed[^>]*\/?>/gi, '')
  s = s.replace(/<applet[^>]*>[\s\S]*?<\/applet>/gi, '')
  if (trimSpaces) s = s.trim()
  return htmlUnescape(s)
}

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g

function autolink(text: string): string {
  return text.replace(URL_REGEX, (url) => {
    const clean = url.replace(/[.,;:!?]+$/, '')
    if (clean.length < 4) return url
    return `[${clean}](${clean})`
  })
}

function truncateWithEllipsis(str: string, maxWidth: number): string {
  const w = getStringWidth(str)
  if (w <= maxWidth) return str
  let result = ''
  let width = 0
  for (const char of str) {
    const code = char.codePointAt(0)!
    const cw = (code >= 0x1100 && code <= 0x115F) || (code >= 0x2E80 && code <= 0x303E) ||
      (code >= 0x3040 && code <= 0x33BF) || (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0xA000 && code <= 0xA4CF) ||
      (code >= 0xAC00 && code <= 0xD7AF) || (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE10 && code <= 0xFE19) || (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF00 && code <= 0xFF60) || (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FFFD) || (code >= 0x30000 && code <= 0x3FFFD) ? 2 : 1
    if (width + cw + 2 > maxWidth) {
      result += '...'
      break
    }
    result += char
    width += cw
  }
  return result
}

function getStringWidth(str: string): number {
  let width = 0
  let inEscape = false
  let inOSC = false
  for (const char of str) {
    if (char === "\x1b") { inEscape = true; inOSC = false; continue }
    if (inEscape) {
      if (char === "[") { inEscape = false; continue }
      if (char === "]") { inOSC = true; inEscape = false; continue }
      inEscape = false
      continue
    }
    if (inOSC) {
      if (char === "\x07") { inOSC = false; continue }
      if (char === "\x1b") { inEscape = true; inOSC = false; continue }
      continue
    }
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
  type Chroma,
  cascadeStyle,
  cascadeStyles,
  cascadeStylePrimitives,
  styleToCaramel,
  renderText,
  formatToken,
  defaultStyleConfig,
  darkStyle,
  lightStyle,
  asciiStyle,
  nottyStyle,
  pinkStyle,
  draculaStyle,
  tokyoNightStyle,
  DefaultStyles,
} from "./style"

export type { StylePrimitive, StyleBlock, StyleTask, StyleCodeBlock, StyleList, StyleTable, StyleConfig, Chroma }
export { cascadeStyle, cascadeStyles, cascadeStylePrimitives, renderText, formatToken, defaultStyleConfig, darkStyle, lightStyle, asciiStyle, nottyStyle, pinkStyle, draculaStyle, tokyoNightStyle, DefaultStyles }

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
    return [`\x1b]8;${id};${link}\x1b\\`, `\x1b]8;;\x1b\\`, true]
  } catch {
    if (link.startsWith("#")) return ["", "", false]
    const id = `id=${simpleHash(link)}`
    return [`\x1b]8;${id};${link}\x1b\\`, `\x1b]8;;\x1b\\`, true]
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
  emoji: boolean
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
    emoji: false,
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
      return
    }

    try {
      const fs = (globalThis as any).require("fs") as { readFileSync: (p: string, enc: string) => string }
      const jsonBytes = fs.readFileSync(stylePath, "utf-8")
      const parsed = JSON.parse(jsonBytes) as Partial<StyleConfig>
      Object.assign(tr.options.styles, parsed)
    } catch {
      // not a named style and file not found — silently ignore
    }
  }
}

export function WithStyles(styles: StyleConfig): TermRendererOption {
  return (tr) => { tr.options.styles = styles }
}

export function WithStylesFromJSONBytes(jsonBytes: string): TermRendererOption {
  return (tr) => {
    try {
      const parsed = JSON.parse(jsonBytes) as Partial<StyleConfig>
      Object.assign(tr.options.styles, parsed)
    } catch {
      // invalid JSON — silently ignore
    }
  }
}

export function WithStylesFromJSONFile(filename: string): TermRendererOption {
  return (tr) => {
    try {
      const fs = (globalThis as any).require("fs") as { readFileSync: (p: string, enc: string) => string }
      const jsonBytes = fs.readFileSync(filename, "utf-8")
      const parsed = JSON.parse(jsonBytes) as Partial<StyleConfig>
      Object.assign(tr.options.styles, parsed)
    } catch {
      // file not found or invalid JSON — silently ignore
    }
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
  return (tr) => { tr.options.emoji = true }
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

  renderBytes(in_: Uint8Array): Uint8Array {
    const str = new TextDecoder().decode(in_)
    const out = this.render(str)
    return new TextEncoder().encode(out)
  }

  async renderAsync(in_: string): Promise<string> {
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
      const rendered = await this.renderTokenAsync(token, ctx)
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
      case 'list': return this.renderList(token, ctx)
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
      case 'html_block': return sanitizeHtml(token.content, true)
      case 'blank_line': return ''
      default: return null
    }
  }

  private async renderTokenAsync(token: Token, ctx: RenderContext): Promise<string | null> {
    if (token.type === 'code_fence' || token.type === 'code_block') {
      return await this.renderCodeBlockAsync(token, ctx)
    }
    return this.renderToken(token, ctx)
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
    const styled = styleToCaramel(cascaded).render((rules.prefix ?? "") + text + (rules.suffix ?? ""))
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

    const indent = rules.indent ?? 0
    const margin = rules.margin ?? 0
    const indentStr = " ".repeat(indent + margin)

    const lang = token.language
    const code = token.content
    let codeLines: string[]

    if (lang && rules.chroma) {
      codeLines = highlightCodeSync(code, lang, rules.chroma)
    } else {
      codeLines = code.split("\n")
    }

    const codeStyle = styleToCaramel(cascaded)
    const result: string[] = []

    for (const line of codeLines) {
      result.push(indentStr + line)
    }

    return result.join("\n")
  }

  private async renderCodeBlockAsync(token: Token, ctx: RenderContext): Promise<string> {
    const s = ctx.options.styles
    const rules = s.codeBlock
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    const indent = rules.indent ?? 0
    const margin = rules.margin ?? 0
    const indentStr = " ".repeat(indent + margin)

    const code = token.content
    const lang = token.language

    let highlightedLines: string[]
    if (lang) {
      try {
        const { codeToTokens } = await import("shiki")
        const tokens = await codeToTokens(code, { lang: lang as any, theme: "dracula" })
        highlightedLines = tokens.tokens.map((line) => {
          let ansi = ""
          for (const tok of line) {
            if (tok.color) {
              const r = parseInt(tok.color.slice(1, 3), 16)
              const g = parseInt(tok.color.slice(3, 5), 16)
              const b = parseInt(tok.color.slice(5, 7), 16)
              ansi += `\x1b[38;2;${r};${g};${b}m${tok.content}`
            } else {
              ansi += tok.content
            }
          }
          return ansi + "\x1b[0m"
        })
      } catch {
        highlightedLines = code.split("\n")
      }
    } else {
      highlightedLines = code.split("\n")
    }

    const result: string[] = []
    for (const line of highlightedLines) {
      result.push(indentStr + line)
    }

    return result.join("\n")
  }

  private renderHorizontalRule(_token: Token, ctx: RenderContext): string {
    const s = ctx.options.styles
    const rules = s.horizontalRule
    const cs = ctx.blockStack.current()
    const cascaded = cascadeStyle(cs.style, rules, false)

    let format = rules.format ?? "\n--------\n"
    // Extract the visible content between newlines and style only that
    const inner = format.replace(/^\n+|\n+$/g, "")
    return "\n" + renderText(inner, cascaded) + "\n"
  }

  private renderList(token: Token, ctx: RenderContext): string {
    const children = token.children ?? []
    const results: string[] = []
    let counter = token.ordered ? 1 : 0

    for (const child of children) {
      const childToken = { ...child }
      if (token.ordered && childToken.type === 'list_item') {
        childToken.type = 'ordered_list_item'
        childToken.ordered = true
        childToken.startNumber = counter
      }
      if (childToken.children && childToken.children.length > 0) {
        const childList: Token = {
          type: 'list',
          content: '',
          ordered: childToken.type === 'ordered_list_item',
          children: childToken.children,
        }
        const nestedItems: string[] = []
        if (childToken.type !== 'blank_line' && childToken.content) {
          nestedItems.push(this.renderToken(childToken, ctx) ?? '')
        }
        nestedItems.push(this.renderList(childList, ctx))
        results.push(nestedItems.join('\n'))
      } else {
        const rendered = this.renderToken(childToken, ctx)
        if (rendered !== null) results.push(rendered)
      }
      if (token.ordered) counter++
    }

    return results.join('\n')
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
    if (rows.length > 0 && rows[0]?.children) {
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

    // In glamour, ALL outer borders are disabled (BorderTop/Left/Right/Bottom = false).
    // Only internal separators are visible: colSep between columns, rowSep for row lines.
    const sepLine = colWidths.map(w => rowSep.repeat(w + 2)).join(centerSep)
    const result: string[] = []

    for (let r = 0; r < allCells.length; r++) {
      const row = allCells[r]!
      const cells: string[] = []

      for (let c = 0; c < colCount; c++) {
        const cellText = row[c] ?? ''
        const truncated = truncateWithEllipsis(cellText, colWidths[c]!)
        const align = alignments[c] ?? 'none'
        const padded = align === 'center'
          ? padCenter(truncated, colWidths[c]!)
          : align === 'right'
          ? padLeft(truncated, colWidths[c]!)
          : padRight(truncated, colWidths[c]!)
        cells.push(' ' + padded + ' ')
      }

      const rowStr = cells.join(colSep)
      if (r === 0) {
        const headerStyle = cascadeStyle(cascaded, ctx.options.styles.strong, false)
        result.push(styleToCaramel(headerStyle).render(rowStr))
        result.push(styleToCaramel(cascaded).render(sepLine))
      } else {
        result.push(styleToCaramel(cascaded).render(rowStr))
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
        case 'text': {
          const text = htmlUnescape(token.content)
          const autolinked = autolink(text)
          if (autolinked !== text) {
            const linkStyle = cascadeStyle(cs.style, s.link, false)
            const parsed = parseInlineTokens(autolinked)
            result += this.renderInlineTokens(parsed, ctx)
          } else {
            result += text
          }
          break
        }
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
          const url = token.href ?? ""

          const textStyle = cascadeStyle(cs.style, s.linkText, false)
          const urlStyle = cascadeStyle(cs.style, s.link, false)

          // Text part (bold green)
          result += hyperlink[0] + styleToCaramel(textStyle).render(linkText) + hyperlink[1]
          // URL part (underlined, gray)
          if (url && !url.startsWith("#")) {
            result += " "
            result += hyperlink[0] + styleToCaramel(urlStyle).render(url) + hyperlink[1]
          }
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
              result += hyperlink[0] + styleToCaramel(textStyle).render(formattedText) + hyperlink[1]
            }
            result += " "
            result += hyperlink[0] + styleToCaramel(urlStyle).render(resolved) + hyperlink[1]
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

  read(buf: Uint8Array): number {
    const chunk = this._renderBuf.slice(this._renderBufOffset, this._renderBufOffset + buf.length)
    chunk.forEach((v, i) => { buf[i] = v })
    this._renderBufOffset += chunk.length
    return chunk.length
  }

  write(data: Uint8Array): number {
    const arr = new Uint8Array(this._writeBuf.length + data.length)
    arr.set(this._writeBuf)
    arr.set(data, this._writeBuf.length)
    this._writeBuf = arr
    return data.length
  }

  close(): void {
    const str = new TextDecoder().decode(this._writeBuf)
    const out = this.render(str)
    this._renderBuf = new TextEncoder().encode(out)
    this._renderBufOffset = 0
    this._writeBuf = new Uint8Array(0)
  }

  setWidth(width: number): void {
    this.options.wordWrap = width
  }

  setStyle(style: StyleConfig): void {
    this.options.styles = style
  }

  private _writeBuf = new Uint8Array(0)
  private _renderBuf = new Uint8Array(0)
  private _renderBufOffset = 0
}

interface KeywordSet {
  keywords: string[]
  builtins?: string[]
  strings?: boolean
  comments?: boolean
}

const LANGUAGE_KEYWORDS: Record<string, KeywordSet> = {
  javascript: {
    keywords: ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'],
    builtins: ['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set', 'Symbol', 'Proxy', 'Reflect', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'null', 'NaN', 'Infinity'],
    strings: true,
    comments: true,
  },
  typescript: {
    keywords: ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'abstract', 'as', 'declare', 'is', 'keyof', 'namespace', 'readonly', 'require'],
    builtins: ['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set', 'Symbol', 'Proxy', 'Reflect', 'Partial', 'Required', 'Record', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters'],
    strings: true,
    comments: true,
  },
  python: {
    keywords: ['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'],
    builtins: ['True', 'False', 'None', 'print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'object', 'super', 'self', 'cls', 'property', 'staticmethod', 'classmethod', 'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr', 'repr', 'id', 'hash', 'input', 'open', 'file', 'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError'],
    strings: true,
    comments: true,
  },
  go: {
    keywords: ['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var'],
    builtins: ['true', 'false', 'nil', 'iota', 'append', 'cap', 'close', 'complex', 'copy', 'delete', 'imag', 'len', 'make', 'new', 'panic', 'print', 'println', 'real', 'recover', 'error', 'string', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'complex64', 'complex128', 'bool', 'byte', 'rune', 'any', 'comparable'],
    strings: true,
    comments: true,
  },
  rust: {
    keywords: ['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'yield'],
    builtins: ['String', 'Vec', 'Box', 'Rc', 'Arc', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'println', 'eprintln', 'format', 'vec', 'assert', 'assert_eq', 'assert_ne', 'panic', 'todo', 'unimplemented', 'unreachable', 'cfg', 'derive', 'Debug', 'Clone', 'Copy', 'Default', 'Display', 'From', 'Into'],
    strings: true,
    comments: true,
  },
  java: {
    keywords: ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while'],
    builtins: ['String', 'System', 'Object', 'Class', 'Integer', 'Double', 'Boolean', 'ArrayList', 'HashMap', 'List', 'Map', 'Set', 'Collection', 'Iterator', 'Exception', 'RuntimeException', 'NullPointerException', 'System.out', 'System.err'],
    strings: true,
    comments: true,
  },
  bash: {
    keywords: ['if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while', 'until', 'do', 'done', 'in', 'function', 'return', 'exit', 'local', 'export', 'source', 'declare', 'typeset', 'readonly', 'unset', 'shift', 'set', 'eval', 'exec', 'trap', 'wait', 'kill', 'alias', 'unalias', 'hash', 'builtin', 'command', 'enable', 'help', 'type', 'which', 'test', 'true', 'false', 'readonly'],
    builtins: ['echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'cat', 'grep', 'sed', 'awk', 'find', 'sort', 'uniq', 'wc', 'head', 'tail', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'touch', 'tar', 'gzip', 'gunzip', 'curl', 'wget', 'ssh', 'scp', 'git', 'docker', 'env', 'date', 'sleep', 'tee', 'xargs', '管道'],
    strings: true,
    comments: true,
  },
  c: {
    keywords: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', '_Alignas', '_Alignof', '_Atomic', '_Bool', '_Complex', '_Generic', '_Imaginary', '_Noreturn', '_Static_assert', '_Thread_local'],
    builtins: ['NULL', 'EOF', 'stdin', 'stdout', 'stderr', 'printf', 'scanf', 'malloc', 'calloc', 'realloc', 'free', 'strlen', 'strcpy', 'strncpy', 'strcmp', 'strncmp', 'strcat', 'strncat', 'memcpy', 'memmove', 'memset', 'memcmp', 'FILE', 'size_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t'],
    strings: true,
    comments: true,
  },
  cpp: {
    keywords: ['alignas', 'alignof', 'and', 'asm', 'auto', 'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'nullptr', 'operator', 'private', 'protected', 'public', 'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while'],
    builtins: ['std', 'string', 'vector', 'map', 'set', 'pair', 'tuple', 'array', 'list', 'deque', 'queue', 'stack', 'unordered_map', 'unordered_set', 'shared_ptr', 'unique_ptr', 'weak_ptr', 'cout', 'cin', 'cerr', 'endl', 'NULL', 'nullptr', 'size_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t'],
    strings: true,
    comments: true,
  },
  html: {
    keywords: ['DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea', 'script', 'style', 'link', 'meta', 'title', 'section', 'article', 'nav', 'header', 'footer', 'main', 'aside', 'figure', 'figcaption', 'video', 'audio', 'source', 'canvas', 'svg'],
    strings: true,
    comments: true,
  },
  css: {
    keywords: ['@import', '@media', '@keyframes', '@font-face', '@supports', '@charset', '@namespace', '@page', '@layer', '@property', '!important', 'inherit', 'initial', 'unset', 'revert'],
    builtins: ['root', 'body', 'html', 'head', 'link', 'meta', 'style', 'script', 'before', 'after', 'first-child', 'last-child', 'nth-child', 'hover', 'focus', 'active', 'visited', 'not', 'is', 'where', 'has'],
    strings: true,
    comments: true,
  },
  json: {
    keywords: ['true', 'false', 'null'],
    strings: true,
  },
  yaml: {
    keywords: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
    strings: true,
    comments: true,
  },
  xml: {
    keywords: ['xml', 'xmlns', 'xsd', 'xsi', 'xsl', 'xslt', 'stylesheet', 'version', 'encoding', 'standalone', 'yes', 'no', 'utf-8', 'utf-16', 'iso-8859-1'],
    strings: true,
    comments: true,
  },
  sql: {
    keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'BEGIN', ' TRANSACTION', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'AS', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'TOP', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'WHILE', 'LOOP', 'FOR', 'DECLARE', 'SET', 'EXEC', 'EXECUTE', 'PROCEDURE', 'FUNCTION', 'RETURN', 'RETURNS', 'TRIGGER', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT', 'SERIAL', 'BIGSERIAL', 'BOOLEAN', 'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'DOUBLE', 'VARCHAR', 'CHAR', 'TEXT', 'BLOB', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME', 'INTERVAL', 'JSON', 'JSONB', 'UUID', 'ARRAY'],
    builtins: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ABS', 'ROUND', 'CEIL', 'FLOOR', 'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'CONCAT', 'COALESCE', 'NULLIF', 'CAST', 'CONVERT', 'NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'EXTRACT', 'DATE_TRUNC', 'AGE', 'TO_CHAR', 'TO_DATE', 'TO_NUMBER', 'REGEXP_MATCHES', 'REGEXP_REPLACE', 'SPLIT_PART', 'ARRAY_AGG', 'STRING_AGG', 'JSON_AGG', 'JSONB_AGG', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'NTILE', 'SUM', 'OVER'],
    strings: true,
    comments: true,
  },
}

function escapeAnsi(code: number): string {
  return `\x1b[${code}m`
}

const ANSI_RESET = '\x1b[0m'
const ANSI_BOLD = '\x1b[1m'
const ANSI_ITALIC = '\x1b[3m'
const ANSI_FG_YELLOW = '\x1b[33m'
const ANSI_FG_GREEN = '\x1b[32m'
const ANSI_FG_CYAN = '\x1b[36m'
const ANSI_FG_MAGENTA = '\x1b[35m'
const ANSI_FG_RED = '\x1b[31m'
const ANSI_FG_BLUE = '\x1b[34m'
const ANSI_FG_GRAY = '\x1b[90m'

function highlightLineSync(line: string, langDef: KeywordSet): string {
  const result: string[] = []
  let i = 0

  while (i < line.length) {
    if (langDef.comments && line[i] === '/' && line[i + 1] === '/') {
      result.push(ANSI_FG_GRAY + line.slice(i) + ANSI_RESET)
      break
    }

    if (langDef.comments && line[i] === '#' && (langDef.keywords.includes('print') || langDef.keywords.includes('echo'))) {
      result.push(ANSI_FG_GRAY + line.slice(i) + ANSI_RESET)
      break
    }

    if (langDef.comments && line.slice(i, i + 2) === '/*') {
      const endIdx = line.indexOf('*/', i + 2)
      if (endIdx !== -1) {
        result.push(ANSI_FG_GRAY + line.slice(i, endIdx + 2) + ANSI_RESET)
        i = endIdx + 2
        continue
      } else {
        result.push(ANSI_FG_GRAY + line.slice(i) + ANSI_RESET)
        break
      }
    }

    if (langDef.comments && line.slice(i, i + 3) === '///') {
      result.push(ANSI_FG_GRAY + line.slice(i) + ANSI_RESET)
      break
    }

    if (langDef.strings && (line[i] === '"' || line[i] === "'" || line[i] === '`')) {
      const quote = line[i]!
      let j = i + 1
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++
        j++
      }
      if (j < line.length) j++
      result.push(ANSI_FG_GREEN + line.slice(i, j) + ANSI_RESET)
      i = j
      continue
    }

    if (/[a-zA-Z_$]/.test(line[i]!)) {
      let j = i
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j]!)) j++
      const word = line.slice(i, j)

      if (langDef.keywords.includes(word)) {
        result.push(ANSI_BOLD + ANSI_FG_MAGENTA + word + ANSI_RESET)
      } else if (langDef.builtins?.includes(word)) {
        result.push(ANSI_FG_CYAN + word + ANSI_RESET)
      } else if (j < line.length && line[j] === '(') {
        result.push(ANSI_FG_BLUE + word + ANSI_RESET)
      } else if (word[0] === word[0]!.toUpperCase() && /^[A-Z]/.test(word)) {
        result.push(ANSI_FG_YELLOW + word + ANSI_RESET)
      } else {
        result.push(word)
      }
      i = j
      continue
    }

    if (/[0-9]/.test(line[i]!)) {
      let j = i
      while (j < line.length && /[0-9.xXa-fA-FeE_]/.test(line[j]!)) j++
      result.push(ANSI_FG_CYAN + line.slice(i, j) + ANSI_RESET)
      i = j
      continue
    }

    if (/[+\-*/%=<>!&|^~?:]/.test(line[i]!)) {
      let j = i
      while (j < line.length && /[+\-*/%=<>!&|^~?:]/.test(line[j]!)) j++
      result.push(ANSI_FG_RED + line.slice(i, j) + ANSI_RESET)
      i = j
      continue
    }

    if (/[()[\]{}]/.test(line[i]!)) {
      result.push(ANSI_FG_GRAY + line[i]! + ANSI_RESET)
      i++
      continue
    }

    result.push(line[i]!)
    i++
  }

  return result.join('')
}

function highlightCodeSync(code: string, lang: string, _chroma: Chroma): string[] {
  const langDef = LANGUAGE_KEYWORDS[lang]
  if (!langDef) return code.split("\n")

  const lines = code.split("\n")
  return lines.map(line => highlightLineSync(line, langDef))
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
    if (src.code_block.Chroma) {
      const chroma: Chroma = {}
      const c = src.code_block.Chroma
      for (const key of Object.keys(c)) {
        const k = key as string
        const v = (c as any)[k]
        if (v && typeof v === 'object') {
          (chroma as any)[k] = mapPrimitive(v)
        }
      }
      dst.codeBlock.chroma = chroma
    }
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

  async renderAsync(markdown: string): Promise<string> {
    return await this.renderer.renderAsync(markdown)
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

export function Plain(markdown: string, config?: RendererConfig): string {
  const renderer = new Renderer(config)
  return renderer.render(markdown)
}

export function NewTermRenderer(...options: TermRendererOption[]): TermRenderer {
  const tr = new TermRenderer()
  for (const opt of options) {
    opt(tr)
  }
  return tr
}

export async function Render(markdown: string, config?: RendererConfig): Promise<string> {
  const renderer = new Renderer(config)
  return await renderer.renderAsync(markdown)
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

export function RenderBytes(input: string, stylePath: string): string {
  const style = getNamedStyle(stylePath) ?? defaultStyleConfig
  const renderer = new Renderer({ style })
  return renderer.render(input)
}

// renderer.ts | markdown renderer (glamour port)

import { Style, NewStyle } from "caramel"

/**
 * StyleConfig contains styles for rendering markdown.
 */
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
  table: Style
  tableHeader: Style
  tableCell: Style
}

/**
 * Default styles for dark theme.
 */
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
  table: NewStyle(),
  tableHeader: NewStyle().bold(true),
  tableCell: NewStyle(),
}

/**
 * Default styles for light theme.
 */
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
  table: NewStyle(),
  tableHeader: NewStyle().bold(true),
  tableCell: NewStyle(),
}

/**
 * RendererConfig is the configuration for the renderer.
 */
export interface RendererConfig {
  width?: number
  style?: StyleConfig
}

/**
 * Renderer renders markdown to styled terminal output.
 */
export class Renderer {
  private width: number
  private style: StyleConfig

  constructor(config: RendererConfig = {}) {
    this.width = config.width ?? 80
    this.style = config.style ?? darkStyle
  }

  /**
   * Render renders markdown to styled text.
   */
  render(markdown: string): string {
    const lines = markdown.split("\n")
    const result: string[] = []
    let inCodeBlock = false
    let codeContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!

      // Code blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          result.push(this.style.codeBlock.render(codeContent.join("\n")))
          codeContent = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeContent.push(line)
        continue
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
      if (headingMatch) {
        const level = headingMatch[1]!.length - 1
        const text = headingMatch[2]!
        result.push(this.style.heading[Math.min(level, 5)]!.render(text))
        continue
      }

      // Horizontal rule
      if (/^[-*_]{3,}$/.test(line)) {
        result.push(this.style.hr.render("─".repeat(this.width)))
        continue
      }

      // Blockquote
      if (line.startsWith("> ")) {
        const text = line.slice(2)
        result.push(this.style.blockquote.render(`  │ ${text}`))
        continue
      }

      // List items
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)
      if (listMatch) {
        const indent = listMatch[1]!
        const marker = listMatch[2]!
        const text = listMatch[3]!
        result.push(`${indent}${this.style.listItem.render(marker)} ${this.renderInline(text)}`)
        continue
      }

      // Table rows
      if (line.startsWith("|")) {
        const cells = line.split("|").filter((c) => c.trim() !== "")
        const isHeader = i + 1 < lines.length && lines[i + 1]!.match(/^\|[\s\-:|]+\|$/)
        const rendered = cells.map((cell) => {
          const style = isHeader ? this.style.tableHeader : this.style.tableCell
          return style.render(` ${cell.trim()} `)
        }).join("│")
        result.push(`│${rendered}│`)
        continue
      }

      // Table separator
      if (line.match(/^\|[\s\-:|]+\|$/)) {
        continue
      }

      // Empty line
      if (line.trim() === "") {
        result.push("")
        continue
      }

      // Regular paragraph
      result.push(this.renderInline(line))
    }

    return result.join("\n")
  }

  /**
   * renderInline renders inline markdown elements.
   */
  private renderInline(text: string): string {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, (_, content) => {
      return this.style.strong.render(content)
    })

    // Italic
    text = text.replace(/\*(.*?)\*/g, (_, content) => {
      return this.style.emphasis.render(content)
    })

    // Strikethrough
    text = text.replace(/~~(.*?)~~/g, (_, content) => {
      return this.style.strikethrough.render(content)
    })

    // Code
    text = text.replace(/`([^`]+)`/g, (_, content) => {
      return this.style.code.render(content)
    })

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      return this.style.linkText.render(text) + ` (${this.style.link.render(url)})`
    })

    return text
  }

  /**
   * SetWidth sets the renderer width.
   */
  setWidth(width: number): void {
    this.width = width
  }

  /**
   * SetStyle sets the renderer style.
   */
  setStyle(style: StyleConfig): void {
    this.style = style
  }
}

/**
 * NewRenderer creates a new renderer.
 */
export function NewRenderer(config?: RendererConfig): Renderer {
  return new Renderer(config)
}

/**
 * Render renders markdown with default settings.
 */
export function Render(markdown: string, config?: RendererConfig): string {
  const renderer = new Renderer(config)
  return renderer.render(markdown)
}

/**
 * RenderWithStyle renders markdown with a specific style.
 */
export function RenderWithStyle(markdown: string, style: StyleConfig): string {
  const renderer = new Renderer({ style })
  return renderer.render(markdown)
}

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

function extractLastAnsiStyle(str: string): string {
  const matches = str.match(/\x1b\[[0-9;]*m/g)
  if (!matches || matches.length === 0) return ""
  return matches[matches.length - 1]
}

function hasAnsiStyle(str: string): boolean {
  return /\x1b\[[0-9;]*m/.test(str)
}

function stripAnsiStyles(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "")
}

export type PadFunc = (line: string) => string

export function applyPadding(content: string, padding: number, padFunc?: PadFunc): string {
  if (padding <= 0) return content
  const lines = content.split("\n")
  const result: string[] = []

  for (const line of lines) {
    const lineW = getStringWidth(stripAnsiStyles(line))
    if (lineW < padding) {
      const padAmount = padding - lineW
      const padded = padFunc
        ? padFunc(line) + padFunc(line).repeat(padAmount - 1)
        : line + " ".repeat(padAmount)
      result.push(padded)
    } else {
      result.push(line)
    }
  }

  return result.join("\n")
}

export type IndentFunc = (line: string) => string

export function applyIndent(content: string, indent: number, indentFunc?: IndentFunc): string {
  if (indent <= 0) return content
  const lines = content.split("\n")
  const result: string[] = []
  let skipIndent = false
  let lastStyle = ""

  for (const line of lines) {
    if (!skipIndent) {
      if (lastStyle) {
        result.push("\x1b[0m")
      }
      const prefix = indentFunc
        ? Array(indent).fill(null).map(() => indentFunc(line)).join("")
        : " ".repeat(indent)
      result.push(prefix + line)
      if (lastStyle) {
        result.push(lastStyle)
      }
      skipIndent = true
    } else {
      result.push(line)
    }

    if (line === "" || line.endsWith("\n")) {
      skipIndent = false
    }

    const extracted = extractLastAnsiStyle(line)
    if (extracted) {
      lastStyle = extracted
    }
  }

  return result.join("\n")
}

export function applyMargin(
  content: string,
  width: number,
  indent: number,
  margin: number,
  indentToken: string = " ",
  padFunc?: PadFunc,
): string {
  const lines = content.split("\n")
  const result: string[] = []

  for (const line of lines) {
    let padded = line
    const lineW = getStringWidth(stripAnsiStyles(line))
    if (margin > 0 && lineW < margin) {
      const padAmount = margin - lineW
      padded = padFunc
        ? padded + Array(padAmount).fill(null).map(() => padFunc(line)).join("")
        : padded + " ".repeat(padAmount)
    }
    const prefix = indentToken.repeat(indent + margin)
    result.push(prefix + padded)
  }

  return result.join("\n")
}

export function NewMarginWriter(
  content: string,
  width: number,
  indent: number,
  margin: number,
  indentToken: string = " ",
  padFunc?: PadFunc,
): string {
  return applyMargin(content, width, indent, margin, indentToken, padFunc)
}

export function NewPaddingWriter(
  content: string,
  padding: number,
  padFunc?: PadFunc,
): string {
  return applyPadding(content, padding, padFunc)
}

export function NewIndentWriter(
  content: string,
  indent: number,
  indentFunc?: IndentFunc,
): string {
  return applyIndent(content, indent, indentFunc)
}

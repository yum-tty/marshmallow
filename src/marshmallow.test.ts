import { describe, test, expect } from "bun:test"
import {
  Plain,
  Render,
  RenderWithStyle,
  TermRenderer,
  NewTermRenderer,
  darkStyle,
  lightStyle,
  asciiStyle,
  nottyStyle,
  pinkStyle,
  draculaStyle,
  tokyoNightStyle,
  DefaultStyles,
  cascadeStyle,
  cascadeStyles,
  cascadeStylePrimitives,
  defaultStyleConfig,
  renderText,
  formatToken,
} from "./index"
import { tokenize, parseInlineTokens } from "./parser"
import type { StyleConfig, StyleBlock, StylePrimitive } from "./renderer"

// ── Plain ──

describe("Plain", () => {
  test("renders simple heading", () => {
    const out = Plain("# Hello")
    expect(out).toContain("Hello")
  })

  test("renders bold text", () => {
    const out = Plain("**bold**")
    expect(out).toContain("bold")
  })

  test("renders italic text", () => {
    const out = Plain("*italic*")
    expect(out).toContain("italic")
  })

  test("renders unordered list", () => {
    const out = Plain("- item one\n- item two")
    expect(out).toContain("item one")
    expect(out).toContain("item two")
  })

  test("renders ordered list", () => {
    const out = Plain("1. first\n2. second")
    expect(out).toContain("first")
    expect(out).toContain("second")
  })

  test("renders code block", () => {
    const out = Plain("```\nconst x = 1\n```")
    expect(out).toContain("const x = 1")
  })

  test("renders table", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |"
    const out = Plain(md)
    expect(out).toContain("A")
    expect(out).toContain("1")
  })

  test("renders blockquote", () => {
    const out = Plain("> quoted text")
    expect(out).toContain("quoted text")
  })

  test("renders link", () => {
    const out = Plain("[click](https://example.com)")
    expect(out).toContain("click")
  })

  test("renders horizontal rule", () => {
    const out = Plain("---")
    expect(out).toContain("---")
  })
})

// ── Render / RenderWithStyle ──

describe("Render", () => {
  test("renders with default style", async () => {
    const out = await Render("# Title")
    expect(out).toContain("Title")
  })
})

describe("RenderWithStyle", () => {
  test("renders with darkStyle", () => {
    const out = RenderWithStyle("# Dark", darkStyle)
    expect(out).toContain("Dark")
  })

  test("renders with lightStyle", () => {
    const out = RenderWithStyle("# Light", lightStyle)
    expect(out).toContain("Light")
  })

  test("renders with draculaStyle", () => {
    const out = RenderWithStyle("# Dracula", draculaStyle)
    expect(out).toContain("Dracula")
  })
})

// ── ANSI codes in styled output ──

describe("ANSI codes", () => {
  test("styled output contains ANSI escape sequences", async () => {
    const out = await Render("# Heading")
    expect(out).toMatch(/\x1b\[/)
  })

  test("darkStyle output contains ANSI escapes", () => {
    const out = RenderWithStyle("**bold** text", darkStyle)
    expect(out).toMatch(/\x1b\[/)
  })

  test("lightStyle output contains ANSI escapes", () => {
    const out = RenderWithStyle("*italic* text", lightStyle)
    expect(out).toMatch(/\x1b\[/)
  })

  test("pinkStyle output contains ANSI escapes", () => {
    const out = RenderWithStyle("**bold**", pinkStyle)
    expect(out).toMatch(/\x1b\[/)
  })

  test("draculaStyle output contains ANSI escapes", () => {
    const out = RenderWithStyle("**bold**", draculaStyle)
    expect(out).toMatch(/\x1b\[/)
  })

  test("tokyoNightStyle output contains ANSI escapes", () => {
    const out = RenderWithStyle("**bold**", tokyoNightStyle)
    expect(out).toMatch(/\x1b\[/)
  })
})

// ── TermRenderer ──

describe("TermRenderer", () => {
  test("creates renderer with default options", () => {
    const tr = new TermRenderer()
    expect(tr).toBeDefined()
    expect(tr.options).toBeDefined()
    expect(tr.options.wordWrap).toBe(80)
  })

  test("renders markdown", () => {
    const tr = new TermRenderer()
    const out = tr.render("# Hello World")
    expect(out).toContain("Hello World")
  })

  test("setWidth changes word wrap", () => {
    const tr = new TermRenderer()
    tr.setWidth(40)
    expect(tr.options.wordWrap).toBe(40)
  })

  test("setStyle changes style config", () => {
    const tr = new TermRenderer()
    tr.setStyle(lightStyle)
    expect(tr.options.styles).toBe(lightStyle)
  })

  test("read/write/close round-trip", () => {
    const tr = new TermRenderer()
    const input = "# Test\nHello"
    const encoder = new TextEncoder()
    const buf = encoder.encode(input)
    tr.write(buf)
    tr.close()

    const outputBuf = new Uint8Array(1024)
    const n = tr.read(outputBuf)
    expect(n).toBeGreaterThan(0)
    const out = new TextDecoder().decode(outputBuf.slice(0, n))
    expect(out).toContain("Hello")
  })
})

// ── TermRendererConfig ──

describe("TermRendererConfig", () => {
  test("baseURL sets baseURL", () => {
    const tr = NewTermRenderer({ baseURL: "https://example.com" })
    expect(tr.options.baseURL).toBe("https://example.com")
  })

  test("standardStyle sets named style", () => {
    const tr = NewTermRenderer({ standardStyle: "light" })
    expect(tr.options.styles).toEqual(lightStyle)
  })

  test("standardStyle with dracula", () => {
    const tr = NewTermRenderer({ standardStyle: "dracula" })
    expect(tr.options.styles).toEqual(draculaStyle)
  })

  test("wordWrap sets word wrap width", () => {
    const tr = NewTermRenderer({ wordWrap: 60 })
    expect(tr.options.wordWrap).toBe(60)
  })

  test("tableWrap enables table wrap", () => {
    const tr = NewTermRenderer({ tableWrap: true })
    expect(tr.options.tableWrap).toBe(true)
  })

  test("inlineTableLinks enables inline links", () => {
    const tr = NewTermRenderer({ inlineTableLinks: true })
    expect(tr.options.inlineTableLinks).toBe(true)
  })

  test("preservedNewLines preserves newlines", () => {
    const tr = NewTermRenderer({ preservedNewLines: true })
    expect(tr.options.preserveNewLines).toBe(true)
  })

  test("emoji enables emoji", () => {
    const tr = NewTermRenderer({ emoji: true })
    expect(tr.options.emoji).toBe(true)
  })

  test("chromaFormatter sets formatter", () => {
    const tr = NewTermRenderer({ chromaFormatter: "dracula" })
    expect(tr.options.chromaFormatter).toBe("dracula")
  })

  test("styles sets custom styles", () => {
    const custom: StyleConfig = {
      ...defaultStyleConfig,
      document: { color: "red" },
    }
    const tr = NewTermRenderer({ styles: custom })
    expect(tr.options.styles).toBe(custom)
  })

  test("stylePathFromJSONBytes parses JSON", () => {
    const json = JSON.stringify({ document: { color: "blue" } })
    const tr = NewTermRenderer({ stylePathFromJSONBytes: json })
    expect(tr.options.styles.document.color).toBe("blue")
  })

  test("combines multiple config fields", () => {
    const tr = NewTermRenderer({
      baseURL: "https://test.com",
      wordWrap: 100,
      emoji: true,
    })
    expect(tr.options.baseURL).toBe("https://test.com")
    expect(tr.options.wordWrap).toBe(100)
    expect(tr.options.emoji).toBe(true)
  })
})

// ── Style types ──

describe("Style types", () => {
  test("darkStyle has correct structure", () => {
    expect(darkStyle).toBeDefined()
    expect(darkStyle.document).toBeDefined()
    expect(darkStyle.heading).toBeDefined()
    expect(darkStyle.codeBlock).toBeDefined()
    expect(darkStyle.table).toBeDefined()
  })

  test("lightStyle has correct structure", () => {
    expect(lightStyle).toBeDefined()
    expect(lightStyle.document).toBeDefined()
    expect(lightStyle.document.color).toBe("234")
  })

  test("asciiStyle has correct structure", () => {
    expect(asciiStyle).toBeDefined()
    expect(asciiStyle.blockquote.indentToken).toBe("| ")
  })

  test("nottyStyle is same as asciiStyle", () => {
    expect(nottyStyle).toBe(asciiStyle)
  })

  test("pinkStyle has correct structure", () => {
    expect(pinkStyle).toBeDefined()
    expect(pinkStyle.heading.color).toBe("212")
  })

  test("draculaStyle has correct structure", () => {
    expect(draculaStyle).toBeDefined()
    expect(draculaStyle.heading.color).toBe("#bd93f9")
  })

  test("tokyoNightStyle has correct structure", () => {
    expect(tokyoNightStyle).toBeDefined()
    expect(tokyoNightStyle.document.color).toBe("#a9b1d6")
  })

  test("DefaultStyles contains all styles", () => {
    expect(DefaultStyles.dark).toBe(darkStyle)
    expect(DefaultStyles.light).toBe(lightStyle)
    expect(DefaultStyles.ascii).toBe(asciiStyle)
    expect(DefaultStyles.pink).toBe(pinkStyle)
    expect(DefaultStyles.dracula).toBe(draculaStyle)
    expect(DefaultStyles["tokyo-night"]).toBe(tokyoNightStyle)
  })
})

// ── cascadeStyle / cascadeStyles ──

describe("cascadeStyle", () => {
  test("merges parent into child", () => {
    const parent: StyleBlock = { color: "red", bold: true }
    const child: StyleBlock = { color: "blue" }
    const result = cascadeStyle(parent, child, false)
    expect(result.color).toBe("blue")
    expect(result.bold).toBe(true)
  })

  test("child overrides parent for non-null values", () => {
    const parent: StyleBlock = { color: "red", bold: true }
    const child: StyleBlock = { color: "blue", bold: false }
    const result = cascadeStyle(parent, child, false)
    expect(result.color).toBe("blue")
    expect(result.bold).toBe(false)
  })

  test("preserves child indent/margin when not toBlock", () => {
    const parent: StyleBlock = { indent: 5, margin: 3 }
    const child: StyleBlock = { indent: 2 }
    const result = cascadeStyle(parent, child, false)
    expect(result.indent).toBe(2)
    expect(result.margin).toBeNull()
  })
})

describe("cascadeStyles", () => {
  test("merges multiple blocks", () => {
    const a: StyleBlock = { color: "red" }
    const b: StyleBlock = { bold: true }
    const c: StyleBlock = { color: "blue" }
    const result = cascadeStyles(a, b, c)
    expect(result.color).toBe("blue")
    expect(result.bold).toBe(true)
  })
})

describe("cascadeStylePrimitives", () => {
  test("merges multiple primitives", () => {
    const a: StylePrimitive = { color: "red" }
    const b: StylePrimitive = { bold: true }
    const result = cascadeStylePrimitives(a, b)
    expect(result.color).toBe("red")
    expect(result.bold).toBe(true)
  })
})

// ── renderText / formatToken ──

describe("renderText", () => {
  test("renders text with style", () => {
    const result = renderText("hello", { bold: true })
    expect(result).toContain("hello")
    expect(result).toMatch(/\x1b\[/)
  })

  test("returns empty for empty string", () => {
    const result = renderText("", { bold: true })
    expect(result).toBe("")
  })

  test("applies upper case", () => {
    const result = renderText("hello", { upper: true })
    expect(result).toContain("HELLO")
  })

  test("applies lower case", () => {
    const result = renderText("HELLO", { lower: true })
    expect(result).toContain("hello")
  })
})

describe("formatToken", () => {
  test("replaces .text", () => {
    const result = formatToken("Image: {{.text}} →", "photo")
    expect(result).toBe("Image: photo →")
  })

  test("applies upper filter", () => {
    const result = formatToken("{{.text | upper}}", "hello")
    expect(result).toBe("HELLO")
  })

  test("applies lower filter", () => {
    const result = formatToken("{{.text | lower}}", "HELLO")
    expect(result).toBe("hello")
  })

  test("applies title filter", () => {
    const result = formatToken("{{.text | title}}", "hello world")
    expect(result).toBe("Hello World")
  })
})

// ── Token parsing ──

describe("tokenize", () => {
  test("tokenizes heading", () => {
    const tokens = tokenize("# Heading")
    expect(tokens.length).toBeGreaterThan(0)
    const heading = tokens.find(t => t.type === "heading")
    expect(heading).toBeDefined()
    expect(heading!.content).toBe("Heading")
    expect(heading!.level).toBe(1)
  })

  test("tokenizes paragraph", () => {
    const tokens = tokenize("Hello world")
    const para = tokens.find(t => t.type === "paragraph")
    expect(para).toBeDefined()
    expect(para!.content).toContain("Hello world")
  })

  test("tokenizes code fence", () => {
    const tokens = tokenize("```js\nconst x = 1\n```")
    const code = tokens.find(t => t.type === "code_fence")
    expect(code).toBeDefined()
    expect(code!.content).toContain("const x = 1")
    expect(code!.language).toBe("javascript")
  })

  test("tokenizes unordered list", () => {
    const tokens = tokenize("- one\n- two")
    const list = tokens.find(t => t.type === "list")
    expect(list).toBeDefined()
    expect(list!.children).toBeDefined()
    expect(list!.children!.length).toBe(2)
  })

  test("tokenizes ordered list", () => {
    const tokens = tokenize("1. first\n2. second")
    const list = tokens.find(t => t.type === "list")
    expect(list).toBeDefined()
    expect(list!.ordered).toBe(true)
  })

  test("tokenizes blockquote", () => {
    const tokens = tokenize("> quoted")
    const bq = tokens.find(t => t.type === "blockquote")
    expect(bq).toBeDefined()
  })

  test("tokenizes table", () => {
    const tokens = tokenize("| A | B |\n|---|---|\n| 1 | 2 |")
    const table = tokens.find(t => t.type === "table")
    expect(table).toBeDefined()
    expect(table!.children!.length).toBe(2)
  })

  test("tokenizes thematic break", () => {
    const tokens = tokenize("---")
    const hr = tokens.find(t => t.type === "thematic_break")
    expect(hr).toBeDefined()
  })

  test("tokenizes task items", () => {
    const tokens = tokenize("- [x] done\n- [ ] pending")
    const list = tokens.find(t => t.type === "list")
    expect(list).toBeDefined()
    const children = list!.children ?? []
    const checked = children.find(t => t.type === "task_checked")
    const unchecked = children.find(t => t.type === "task_unchecked")
    expect(checked).toBeDefined()
    expect(unchecked).toBeDefined()
  })

  test("tokenizes footnote definitions", () => {
    const tokens = tokenize("Text[^1]\n\n[^1]: footnote content")
    const fnList = tokens.find(t => t.type === "footnote_list")
    expect(fnList).toBeDefined()
  })
})

describe("parseInlineTokens", () => {
  test("parses bold", () => {
    const tokens = parseInlineTokens("**bold**")
    expect(tokens.length).toBe(1)
    expect(tokens[0]!.type).toBe("strong")
    expect(tokens[0]!.content).toBe("bold")
  })

  test("parses italic", () => {
    const tokens = parseInlineTokens("*italic*")
    expect(tokens.length).toBe(1)
    expect(tokens[0]!.type).toBe("em")
    expect(tokens[0]!.content).toBe("italic")
  })

  test("parses strikethrough", () => {
    const tokens = parseInlineTokens("~~deleted~~")
    expect(tokens.length).toBe(1)
    expect(tokens[0]!.type).toBe("strikethrough")
  })

  test("parses code span", () => {
    const tokens = parseInlineTokens("`code`")
    expect(tokens.length).toBe(1)
    expect(tokens[0]!.type).toBe("codespan")
    expect(tokens[0]!.content).toBe("code")
  })

  test("parses link", () => {
    const tokens = parseInlineTokens("[text](https://example.com)")
    expect(tokens.length).toBe(1)
    expect(tokens[0]!.type).toBe("link")
    expect(tokens[0]!.href).toBe("https://example.com")
  })

  test("parses image", () => {
    const tokens = parseInlineTokens("![alt](image.png)")
    expect(tokens.length).toBe(1)
    expect(tokens[0]!.type).toBe("image")
    expect(tokens[0]!.alt).toBe("alt")
  })

  test("parses mixed inline tokens", () => {
    const tokens = parseInlineTokens("hello **bold** world")
    expect(tokens.length).toBeGreaterThanOrEqual(3)
    const strong = tokens.find(t => t.type === "strong")
    expect(strong).toBeDefined()
  })

  test("parses footnote link", () => {
    const tokens = parseInlineTokens("[^ref]")
    expect(tokens.length).toBe(1)
    // Inline parser treats [^...] as ref_link; block parser resolves to footnote_link
    expect(tokens[0]!.type).toBe("ref_link")
  })
})

// ── Integration: complex markdown ──

describe("complex markdown rendering", () => {
  test("renders mixed content", async () => {
    const md = [
      "# Title",
      "",
      "A paragraph with **bold** and *italic*.",
      "",
      "- item 1",
      "- item 2",
      "",
      "> blockquote",
      "",
      "```js",
      "console.log('hi')",
      "```",
    ].join("\n")
    const out = await Render(md)
    expect(out).toContain("Title")
    expect(out).toContain("bold")
    expect(out).toContain("item 1")
    expect(out).toContain("blockquote")
    expect(out).toContain("console")
  })

  test("renders table with alignment", async () => {
    const md = "| Left | Center | Right |\n|:-----|:------:|------:|\n| a | b | c |"
    const out = await Render(md)
    expect(out).toContain("a")
    expect(out).toContain("b")
    expect(out).toContain("c")
  })
})

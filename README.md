# Cinnamon Marshmallow

<p>
    <a href="https://github.com/charmbracelet/glamour"><img src="https://img.shields.io/badge/original-glamour-blue" alt="Original Glamour"></a>
    <a href="https://github.com/yum-tty/marshmallow"><img src="https://img.shields.io/badge/port--marshmallow-green" alt="Marshmallow Port"></a>
    <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-bun-black" alt="Bun Runtime"></a>
</p>

Markdown rendering for the terminal. A TypeScript port of [Glamour](https://github.com/charmbracelet/glamour) for Bun.

Cinnamon Marshmallow renders markdown documents with ANSI styles for beautiful terminal output.

## Installation

```bash
bun add github:yum-tty/marshmallow
```

Or install from a specific package:

```bash
bun add cinnamon-marshmallow
```

## Quick Start

```typescript
import { Render } from "cinnamon-marshmallow"

const markdown = `# Hello World

This is **bold** and *italic* text.

## Features

- Item 1
- Item 2
- Item 3

> This is a blockquote

\`\`\`typescript
const hello = "world"
\`\`\`
`

console.log(Render(markdown))
```

## Features

### Basic Rendering

```typescript
import { Render } from "cinnamon-marshmallow"

const output = Render("# Title\n\nSome **bold** text.")
console.log(output)
```

### Custom Width

```typescript
import { Render } from "cinnamon-marshmallow"

const output = Render(markdown, { width: 60 })
console.log(output)
```

### Dark and Light Themes

```typescript
import { Render, RenderWithStyle, darkStyle, lightStyle } from "cinnamon-marshmallow"

// Dark theme (default)
const darkOutput = Render(markdown)

// Light theme
const lightOutput = RenderWithStyle(markdown, lightStyle)
```

### Custom Renderer

```typescript
import { NewRenderer } from "cinnamon-marshmallow"

const renderer = NewRenderer({
  width: 80,
  style: darkStyle,
})

const output = renderer.render(markdown)
console.log(output)
```

## Supported Markdown

Cinnamon Marshmallow supports:

- Headings (h1-h6)
- Bold, italic, strikethrough
- Links and images
- Code blocks (with syntax highlighting)
- Blockquotes
- Ordered and unordered lists
- Tables
- Horizontal rules
- Inline code

## API Reference

### Render

```typescript
Render(markdown: string, config?: RendererConfig): string
```

Renders markdown to styled terminal output.

### RenderWithStyle

```typescript
RenderWithStyle(markdown: string, style: StyleConfig): string
```

Renders markdown with a specific style.

### NewRenderer

```typescript
NewRenderer(config?: RendererConfig): Renderer
```

Creates a new renderer instance.

### RendererConfig

| Option | Type | Description |
|--------|------|-------------|
| `width` | number | Maximum width (default: 80) |
| `style` | StyleConfig | Style configuration |

### StyleConfig

| Property | Type | Description |
|----------|------|-------------|
| `document` | Style | Document style |
| `blockquote` | Style | Blockquote style |
| `heading` | Style[] | Heading styles (h1-h6) |
| `hr` | Style | Horizontal rule style |
| `link` | Style | Link style |
| `linkText` | Style | Link text style |
| `emphasis` | Style | Emphasis style |
| `strong` | Style | Strong style |
| `strikethrough` | Style | Strikethrough style |
| `code` | Style | Inline code style |
| `codeBlock` | Style | Code block style |
| `list` | Style | List style |
| `listItem` | Style | List item style |
| `table` | Style | Table style |
| `tableHeader` | Style | Table header style |
| `tableCell` | Style | Table cell style |

## Examples

### Render README

```typescript
import { Render } from "cinnamon-marshmallow"
import { readFileSync } from "fs"

const readme = readFileSync("README.md", "utf-8")
console.log(Render(readme))
```

### Custom Theme

```typescript
import { NewRenderer, darkStyle, Style } from "cinnamon-marshmallow"
import { NewStyle } from "caramel"

const customStyle = {
  ...darkStyle,
  heading: [
    NewStyle().bold(true).foreground("#FF0000"),
    NewStyle().bold(true).foreground("#FF6600"),
    NewStyle().bold(true).foreground("#FFFF00"),
    NewStyle().bold(true).foreground("#00FF00"),
    NewStyle().bold(true).foreground("#0066FF"),
    NewStyle().bold(true).foreground("#9900FF"),
  ],
}

const renderer = NewRenderer({ style: customStyle })
console.log/renderer.render("# Red Heading"))
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

[MIT](./LICENSE)

---

Based on [Glamour](https://github.com/charmbracelet/glamour) by [Charm](https://charm.sh).

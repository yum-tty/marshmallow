import { Style, NewStyle } from "caramel"

export interface StylePrimitive {
  blockPrefix?: string
  blockSuffix?: string
  prefix?: string
  suffix?: string
  color?: string | null
  backgroundColor?: string | null
  underline?: boolean | null
  bold?: boolean | null
  upper?: boolean | null
  lower?: boolean | null
  title?: boolean | null
  italic?: boolean | null
  crossedOut?: boolean | null
  faint?: boolean | null
  conceal?: boolean | null
  inverse?: boolean | null
  blink?: boolean | null
  format?: string
}

export interface StyleBlock extends StylePrimitive {
  indent?: number | null
  indentToken?: string | null
  margin?: number | null
}

export interface StyleTask extends StylePrimitive {
  ticked?: string
  unticked?: string
}

export interface StyleCodeBlock extends StyleBlock {
  theme?: string
}

export interface StyleList extends StyleBlock {
  levelIndent?: number
}

export interface StyleTable extends StyleBlock {
  centerSeparator?: string | null
  columnSeparator?: string | null
  rowSeparator?: string | null
}

export interface StyleConfig {
  document: StyleBlock
  blockquote: StyleBlock
  paragraph: StyleBlock
  list: StyleList
  heading: StyleBlock
  h1: StyleBlock
  h2: StyleBlock
  h3: StyleBlock
  h4: StyleBlock
  h5: StyleBlock
  h6: StyleBlock
  text: StylePrimitive
  strikethrough: StylePrimitive
  emph: StylePrimitive
  strong: StylePrimitive
  horizontalRule: StylePrimitive
  item: StylePrimitive
  enumeration: StylePrimitive
  task: StyleTask
  link: StylePrimitive
  linkText: StylePrimitive
  image: StylePrimitive
  imageText: StylePrimitive
  code: StyleBlock
  codeBlock: StyleCodeBlock
  table: StyleTable
  definitionList: StyleBlock
  definitionTerm: StylePrimitive
  definitionDescription: StylePrimitive
  htmlBlock: StyleBlock
  htmlSpan: StyleBlock
  footnote: StylePrimitive
  footnoteList: StyleBlock
  footnoteLink: StylePrimitive
  footnoteBacklink: StylePrimitive
}

const defaultListIndent = 2
const defaultListLevelIndent = 4
const defaultMargin = 2
const defaultHeadingPrefixH2 = "## "
const defaultHeadingPrefixH3 = "### "
const defaultHeadingPrefixH4 = "#### "
const defaultHeadingPrefixH5 = "##### "
const defaultHeadingPrefixH6 = "###### "
const defaultTaskTickedPrefix = "[✓] "
const defaultTaskUntickedPrefix = "[ ] "
const defaultImageFormat = "Image: {{.text}} →"
const defaultHorizontalRule = "\n--------\n"
const defaultArrowBlockPrefix = "\n🠶 "

function strPtr(s: string): string | null { return s }
function boolPtr(b: boolean): boolean | null { return b }
function numPtr(u: number): number | null { return u }

export const defaultStyleConfig: StyleConfig = {
  document: {
    blockPrefix: "\n",
    blockSuffix: "\n",
    color: strPtr("252"),
    margin: numPtr(defaultMargin),
  },
  blockquote: {
    indent: numPtr(1),
    indentToken: strPtr("│ "),
  },
  paragraph: {},
  list: {
    levelIndent: defaultListIndent,
  },
  heading: {
    blockSuffix: "\n",
    color: strPtr("39"),
    bold: boolPtr(true),
  },
  h1: {
    prefix: " ",
    suffix: "",
    color: strPtr("228"),
    bold: boolPtr(true),
  },
  h2: {
    prefix: defaultHeadingPrefixH2,
  },
  h3: {
    prefix: defaultHeadingPrefixH3,
  },
  h4: {
    prefix: defaultHeadingPrefixH4,
  },
  h5: {
    prefix: defaultHeadingPrefixH5,
  },
  h6: {
    prefix: defaultHeadingPrefixH6,
    color: strPtr("35"),
    bold: boolPtr(false),
  },
  text: {},
  strikethrough: {
    crossedOut: boolPtr(true),
  },
  emph: {
    italic: boolPtr(true),
  },
  strong: {
    bold: boolPtr(true),
  },
  horizontalRule: {
    color: strPtr("240"),
    format: defaultHorizontalRule,
  },
  item: {
    blockPrefix: "• ",
  },
  enumeration: {
    blockPrefix: ". ",
  },
  task: {
    ticked: defaultTaskTickedPrefix,
    unticked: defaultTaskUntickedPrefix,
  },
  link: {
    color: strPtr("30"),
    underline: boolPtr(true),
  },
  linkText: {
    color: strPtr("35"),
    bold: boolPtr(true),
  },
  image: {
    color: strPtr("212"),
    underline: boolPtr(true),
  },
  imageText: {
    color: strPtr("243"),
    format: defaultImageFormat,
  },
  code: {
    prefix: "\u00a0",
    suffix: "\u00a0",
    color: strPtr("203"),
    backgroundColor: strPtr("236"),
  },
  codeBlock: {
    color: strPtr("244"),
    margin: numPtr(defaultMargin),
  },
  table: {},
  definitionList: {},
  definitionTerm: {},
  definitionDescription: {
    blockPrefix: defaultArrowBlockPrefix,
  },
  htmlBlock: {},
  htmlSpan: {},
  footnote: {},
  footnoteList: {},
  footnoteLink: {},
  footnoteBacklink: {},
}

function spClone(s: StylePrimitive): StylePrimitive {
  return { ...s }
}

function cascadeStylePrimitive(parent: StylePrimitive, child: StylePrimitive, toBlock: boolean): StylePrimitive {
  const s = spClone(child)

  s.color = parent.color
  s.backgroundColor = parent.backgroundColor
  s.underline = parent.underline
  s.bold = parent.bold
  s.upper = parent.upper
  s.title = parent.title
  s.lower = parent.lower
  s.italic = parent.italic
  s.crossedOut = parent.crossedOut
  s.faint = parent.faint
  s.conceal = parent.conceal
  s.inverse = parent.inverse
  s.blink = parent.blink

  if (toBlock) {
    s.blockPrefix = parent.blockPrefix
    s.blockSuffix = parent.blockSuffix
    s.prefix = parent.prefix
    s.suffix = parent.suffix
  }

  if (child.color != null) s.color = child.color
  if (child.backgroundColor != null) s.backgroundColor = child.backgroundColor
  if (child.underline != null) s.underline = child.underline
  if (child.bold != null) s.bold = child.bold
  if (child.upper != null) s.upper = child.upper
  if (child.lower != null) s.lower = child.lower
  if (child.title != null) s.title = child.title
  if (child.italic != null) s.italic = child.italic
  if (child.crossedOut != null) s.crossedOut = child.crossedOut
  if (child.faint != null) s.faint = child.faint
  if (child.conceal != null) s.conceal = child.conceal
  if (child.inverse != null) s.inverse = child.inverse
  if (child.blink != null) s.blink = child.blink
  if (child.blockPrefix != null && child.blockPrefix !== "") s.blockPrefix = child.blockPrefix
  if (child.blockSuffix != null && child.blockSuffix !== "") s.blockSuffix = child.blockSuffix
  if (child.prefix != null && child.prefix !== "") s.prefix = child.prefix
  if (child.suffix != null && child.suffix !== "") s.suffix = child.suffix
  if (child.format != null && child.format !== "") s.format = child.format

  return s
}

export function cascadeStyle(parent: StyleBlock, child: StyleBlock, toBlock: boolean): StyleBlock {
  const s: StyleBlock = { ...child }
  s.indent = child.indent
  s.indentToken = child.indentToken
  s.margin = child.margin

  const cascaded = cascadeStylePrimitive(parent, child, toBlock)
  Object.assign(s, cascaded)
  s.indent = child.indent != null ? child.indent : (toBlock ? parent.indent : null)
  s.indentToken = child.indentToken != null ? child.indentToken : (toBlock ? parent.indentToken : null)
  s.margin = child.margin != null ? child.margin : (toBlock ? parent.margin : null)

  return s
}

export function cascadeStyles(...blocks: StyleBlock[]): StyleBlock {
  let r: StyleBlock = {}
  for (const v of blocks) {
    r = cascadeStyle(r, v, true)
  }
  return r
}

export function cascadeStylePrimitives(...primitives: StylePrimitive[]): StylePrimitive {
  let r: StylePrimitive = {}
  for (const v of primitives) {
    r = cascadeStylePrimitive(r, v, true)
  }
  return r
}

export function styleToCaramel(sp: StylePrimitive): Style {
  let s = NewStyle()
  if (sp.color != null) s = s.foreground(sp.color)
  if (sp.backgroundColor != null) s = s.background(sp.backgroundColor)
  if (sp.bold != null && sp.bold) s = s.bold(true)
  if (sp.italic != null && sp.italic) s = s.italic(true)
  if (sp.underline != null && sp.underline) s = s.underline(true)
  if (sp.crossedOut != null && sp.crossedOut) s = s.strikethrough(true)
  if (sp.inverse != null && sp.inverse) s = s.reverse(true)
  if (sp.blink != null && sp.blink) s = s.blink(true)
  if (sp.faint != null && sp.faint) s = s.faint(true)
  return s
}

const casesUpper = (s: string) => s.toUpperCase()
const casesLower = (s: string) => s.toLowerCase()
const casesTitle = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())

export function renderText(s: string, rules: StylePrimitive): string {
  if (s.length === 0) return s
  if (/^\s+$/.test(s)) return s
  if (rules.upper != null && rules.upper) s = casesUpper(s)
  if (rules.lower != null && rules.lower) s = casesLower(s)
  if (rules.title != null && rules.title) s = casesTitle(s)
  return styleToCaramel(rules).render(s)
}

export function formatToken(format: string, token: string): string {
  return format.replace(/\{\{\.text\}\}/g, token)
}

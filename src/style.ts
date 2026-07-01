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

export interface Chroma {
  text?: StylePrimitive
  error?: StylePrimitive
  comment?: StylePrimitive
  commentPreproc?: StylePrimitive
  keyword?: StylePrimitive
  keywordReserved?: StylePrimitive
  keywordNamespace?: StylePrimitive
  keywordType?: StylePrimitive
  operator?: StylePrimitive
  punctuation?: StylePrimitive
  name?: StylePrimitive
  nameBuiltin?: StylePrimitive
  nameTag?: StylePrimitive
  nameAttribute?: StylePrimitive
  nameClass?: StylePrimitive
  nameConstant?: StylePrimitive
  nameDecorator?: StylePrimitive
  nameException?: StylePrimitive
  nameFunction?: StylePrimitive
  nameOther?: StylePrimitive
  literal?: StylePrimitive
  literalNumber?: StylePrimitive
  literalDate?: StylePrimitive
  literalString?: StylePrimitive
  literalStringEscape?: StylePrimitive
  genericDeleted?: StylePrimitive
  genericEmph?: StylePrimitive
  genericInserted?: StylePrimitive
  genericStrong?: StylePrimitive
  genericSubheading?: StylePrimitive
  background?: StylePrimitive
}

export interface StyleCodeBlock extends StyleBlock {
  theme?: string
  chroma?: Chroma
}

export interface StyleList extends StyleBlock {
  levelIndent?: number
}

export interface StyleTable extends StyleBlock {
  centerSeparator?: string | null
  columnSeparator?: string | null
  rowSeparator?: string | null
  leftSeparator?: string | null
  rightSeparator?: string | null
  topLeft?: string | null
  topRight?: string | null
  bottomLeft?: string | null
  bottomRight?: string | null
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
const defaultTaskTickedPrefix = "[✓] "
const defaultTaskUntickedPrefix = "[ ] "
const defaultImageFormat = "Image: {{.text}} →"
const defaultHorizontalRule = "\n--------\n"
const defaultArrowBlockPrefix = "\n🠶 "

function strPtr(s: string): string | null { return s }
function boolPtr(b: boolean): boolean | null { return b }
function numPtr(u: number): number | null { return u }

export const defaultDarkChroma: Chroma = {
  text: {
    color: strPtr("#C4C4C4"),
  },
  error: {
    color: strPtr("#F1F1F1"),
    backgroundColor: strPtr("#F05B5B"),
  },
  comment: {
    color: strPtr("#676767"),
  },
  commentPreproc: {
    color: strPtr("#FF875F"),
  },
  keyword: {
    color: strPtr("#00AAFF"),
  },
  keywordReserved: {
    color: strPtr("#FF5FD2"),
  },
  keywordNamespace: {
    color: strPtr("#FF5F87"),
  },
  keywordType: {
    color: strPtr("#6E6ED8"),
  },
  operator: {
    color: strPtr("#EF8080"),
  },
  punctuation: {
    color: strPtr("#E8E8A8"),
  },
  name: {
    color: strPtr("#C4C4C4"),
  },
  nameBuiltin: {
    color: strPtr("#FF8EC7"),
  },
  nameTag: {
    color: strPtr("#B083EA"),
  },
  nameAttribute: {
    color: strPtr("#7A7AE6"),
  },
  nameClass: {
    color: strPtr("#F1F1F1"),
    underline: boolPtr(true),
    bold: boolPtr(true),
  },
  nameConstant: {},
  nameDecorator: {
    color: strPtr("#FFFF87"),
  },
  nameFunction: {
    color: strPtr("#00D787"),
  },
  literalNumber: {
    color: strPtr("#6EEFC0"),
  },
  literalString: {
    color: strPtr("#C69669"),
  },
  literalStringEscape: {
    color: strPtr("#AFFFD7"),
  },
  genericDeleted: {
    color: strPtr("#FD5B5B"),
  },
  genericEmph: {
    italic: boolPtr(true),
  },
  genericInserted: {
    color: strPtr("#00D787"),
  },
  genericStrong: {
    bold: boolPtr(true),
  },
  genericSubheading: {
    color: strPtr("#777777"),
  },
  background: {
    backgroundColor: strPtr("#373737"),
  },
}

export const defaultLightChroma: Chroma = {
  text: {
    color: strPtr("#2A2A2A"),
  },
  error: {
    color: strPtr("#F1F1F1"),
    backgroundColor: strPtr("#FF5555"),
  },
  comment: {
    color: strPtr("#8D8D8D"),
  },
  commentPreproc: {
    color: strPtr("#FF875F"),
  },
  keyword: {
    color: strPtr("#279EFC"),
  },
  keywordReserved: {
    color: strPtr("#FF5FD2"),
  },
  keywordNamespace: {
    color: strPtr("#FB406F"),
  },
  keywordType: {
    color: strPtr("#7049C2"),
  },
  operator: {
    color: strPtr("#FF2626"),
  },
  punctuation: {
    color: strPtr("#FA7878"),
  },
  name: {},
  nameBuiltin: {
    color: strPtr("#0A1BB1"),
  },
  nameTag: {
    color: strPtr("#581290"),
  },
  nameAttribute: {
    color: strPtr("#8362CB"),
  },
  nameClass: {
    color: strPtr("#212121"),
    underline: boolPtr(true),
    bold: boolPtr(true),
  },
  nameConstant: {
    color: strPtr("#581290"),
  },
  nameDecorator: {
    color: strPtr("#A3A322"),
  },
  nameFunction: {
    color: strPtr("#019F57"),
  },
  literalNumber: {
    color: strPtr("#22CCAE"),
  },
  literalString: {
    color: strPtr("#7E5B38"),
  },
  literalStringEscape: {
    color: strPtr("#00AEAE"),
  },
  genericDeleted: {
    color: strPtr("#FD5B5B"),
  },
  genericEmph: {
    italic: boolPtr(true),
  },
  genericInserted: {
    color: strPtr("#00D787"),
  },
  genericStrong: {
    bold: boolPtr(true),
  },
  genericSubheading: {
    color: strPtr("#777777"),
  },
  background: {
    backgroundColor: strPtr("#373737"),
  },
}

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
    suffix: " ",
    color: strPtr("228"),
    backgroundColor: strPtr("63"),
    bold: boolPtr(true),
  },
  h2: {
    prefix: "## ",
  },
  h3: {
    prefix: "### ",
  },
  h4: {
    prefix: "#### ",
  },
  h5: {
    prefix: "##### ",
  },
  h6: {
    prefix: "###### ",
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
    chroma: defaultDarkChroma,
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

export type StyleName = "dark" | "light" | "ascii" | "notty" | "pink" | "dracula" | "tokyo-night"

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
  if (child.blockPrefix != null) s.blockPrefix = child.blockPrefix
  if (child.blockSuffix != null) s.blockSuffix = child.blockSuffix
  if (child.prefix != null) s.prefix = child.prefix
  if (child.suffix != null) s.suffix = child.suffix
  if (child.format != null) s.format = child.format

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

function deepCopyStyleConfig(src: StyleConfig): StyleConfig {
  return JSON.parse(JSON.stringify(src))
}

function deepCopyChroma(src: Chroma): Chroma {
  return JSON.parse(JSON.stringify(src))
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
  s.codeBlock.chroma = deepCopyChroma(defaultLightChroma)
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
  s.h1.prefix = ""
  s.h2.prefix = ""
  s.h3.prefix = ""
  s.h4.prefix = ""
  s.h5.prefix = ""
  s.h6.prefix = ""
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

export const DefaultStyles: Record<string, StyleConfig> = {
  dark: darkStyle,
  light: lightStyle,
  ascii: asciiStyle,
  notty: nottyStyle,
  pink: pinkStyle,
  dracula: draculaStyle,
  "tokyo-night": tokyoNightStyle,
}

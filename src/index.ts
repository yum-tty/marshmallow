// index.ts | Cinnamon Marshmallow - glamour port

export { Renderer, NewRenderer, Render, RenderWithStyle } from "./renderer"
export type { StyleConfig, RendererConfig } from "./renderer"
export {
  darkStyle,
  lightStyle,
  asciiStyle,
  nottyStyle,
  pinkStyle,
  draculaStyle,
  tokyoNightStyle,
} from "./renderer"

export { tokenize, parseInlineTokens } from "./parser"
export type { Token, TokenType } from "./parser"

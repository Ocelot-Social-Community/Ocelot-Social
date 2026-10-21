import type { Placement } from '@floating-ui/dom'

/** Where the tooltip sits relative to its element; it flips and shifts at the screen's edges. */
export type TooltipPlacement = Placement

/** How a tooltip is shown and what it says. */
export interface TooltipOptions {
  /** The text. Empty, blank or missing: no tooltip at all. */
  content?: string | null
  /** Default `top`. */
  placement?: TooltipPlacement
  /**
   * Read `content` as HTML instead of plain text. Never with text from outside
   * (user input, device names, …): that would be injected as markup.
   */
  html?: boolean
  /** Keep the line breaks in `content`, left-aligned. */
  multiline?: boolean
  /** Hold the tooltip to a narrow width, so a sentence wraps into a short block. */
  narrow?: boolean
  /** Further classes for the tooltip element. */
  classes?: string | string[]
  /** Milliseconds before showing and hiding; one number for both. Default 750 / 50. */
  delay?: number | { show?: number; hide?: number }
  /** Gap in pixels between the arrow's tip and the element. Default 2. */
  offset?: number
  /** `manual`: hover and focus do nothing, `show` decides. */
  trigger?: 'hover focus' | 'manual'
  /** With `trigger: 'manual'`: whether the tooltip is shown. */
  show?: boolean
}

/** What `v-os-tooltip` takes: the text alone, or the options. */
export type TooltipValue = string | null | undefined | TooltipOptions

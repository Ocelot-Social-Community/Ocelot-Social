/**
 * Finds colours in component source that have no dark-theme counterpart (#11094).
 *
 * A colour belongs in a theme token: `var(--background-color-base, white)` follows the app's
 * theme, while `bg-white`, `#fff` or `rgb(…)` stay the same in light and dark — that is how
 * OsDrawer's panel stayed white in the dark theme (#11092). A literal is fine only as the FALLBACK
 * of a `var()`, for apps that ship no tokens; anywhere else it is reported.
 *
 * Deliberate exceptions (a backdrop that darkens the page in both themes) are listed in
 * check-completeness.ts with their reason, not marked in the source.
 */

export interface LiteralColour {
  /** The literal as written, e.g. `bg-white`, `#fff`, `rgba(0, 0, 0, 0.5)` */
  literal: string
  /** 1-based line in the file */
  line: number
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

const UTILITY =
  'bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|shadow|divide|placeholder|accent|caret|decoration'

/** Tailwind colour utilities from the default palette: `bg-white`, `text-gray-500`, `bg-black/70` */
const TAILWIND_COLOUR = new RegExp(
  `(?<![\\w-])(?:${UTILITY})-(?:white|black|(?:${PALETTE})-\\d{2,3})(?:\\/\\d+)?(?![\\w-])`,
  'g',
)

/** Hex colours and colour functions — anywhere: in CSS, in a Tailwind arbitrary value, in a string */
const COLOUR_VALUE =
  /(?<![\w&])#[\da-f]{3,8}(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi

/** Named colours as a CSS value: `background: white;`, `border: 1px solid black` */
const NAMED_COLOUR = /(?<![\w-])(?:white|black)(?![\w-])/g

/** Blanks out comments but keeps every newline, so line numbers stay right. */
function stripComments(source: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ')
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(?<![:\w])\/\/.*$/gm, blank)
}

/** The ranges of CSS in a file: all of a .css file, the <style> blocks of a .vue file. */
function cssRanges(source: string, isCss: boolean): [number, number][] {
  if (isCss) {
    return [[0, source.length]]
  }
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => {
    const start = match.index + match[0].indexOf('>') + 1
    return [start, start + match[1].length]
  })
}

/**
 * Whether the literal at `index` is (part of) the fallback of a `var()`: walking outwards through
 * the calls that enclose it, one of them is `var(` with a comma before the literal.
 */
function isVarFallback(source: string, index: number): boolean {
  let depth = 0
  let commaSeen = false
  for (let i = index - 1; i >= 0; i--) {
    const char = source.charAt(i)
    if (char === ')') {
      depth++
    } else if (char === '(') {
      if (depth > 0) {
        depth--
        continue
      }
      if (commaSeen && source.slice(Math.max(0, i - 3), i) === 'var') {
        return true
      }
      // Not a var() fallback at this level — maybe the call sits inside one (color-mix in a var)
      commaSeen = false
    } else if (char === ',' && depth === 0) {
      commaSeen = true
    } else if (depth === 0 && /[;{}'"`]/.test(char)) {
      // The start of the declaration or of the string: no call encloses the literal. A newline is
      // no boundary — a CSS value may span lines.
      return false
    }
  }
  return false
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

/** All literal colours in `source` that are not the fallback of a `var()`. */
export function findLiteralColours(source: string, fileName: string): LiteralColour[] {
  const code = stripComments(source)
  const found: { index: number; literal: string }[] = []

  for (const match of code.matchAll(TAILWIND_COLOUR)) {
    found.push({ index: match.index, literal: match[0] })
  }
  for (const match of code.matchAll(COLOUR_VALUE)) {
    // A colour function is reported with its arguments, so the message shows the whole value
    const literal = match[0].endsWith('(')
      ? code.slice(match.index, code.indexOf(')', match.index) + 1)
      : match[0]
    found.push({ index: match.index, literal })
  }
  for (const [start, end] of cssRanges(code, fileName.endsWith('.css'))) {
    for (const match of code.slice(start, end).matchAll(NAMED_COLOUR)) {
      found.push({ index: start + match.index, literal: match[0] })
    }
  }

  return found
    .filter(({ index }) => !isVarFallback(code, index))
    .sort((a, b) => a.index - b.index)
    .map(({ index, literal }) => ({ literal, line: lineOf(code, index) }))
}

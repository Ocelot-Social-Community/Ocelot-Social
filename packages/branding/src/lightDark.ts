// One half of a CSS light-dark() pair — one parser for everyone who has to do without a colour
// scheme: the e-mail stylesheet, manifests and meta tags (brand build, the light half) and the
// webapp's fallback for browsers that lack light-dark() (both halves).

/**
 * `light-dark(a, b)` reduced to `a`. A mail, a manifest or a meta tag has no `color-scheme` to choose
 * by, and most mail clients drop the whole declaration as unknown syntax — the light value stands, as
 * it always did there. Arguments are split at the top-level comma, so `light-dark(rgb(1, 2, 3), …)`
 * keeps its own commas.
 */
export function lightOf(value: string): string {
  return halfOf(value, 0)
}

/**
 * `light-dark(a, b)` reduced to `b`: the dark half, for a browser that has no light-dark() and gets
 * the dark theme from a block of its own.
 */
export function darkOf(value: string): string {
  return halfOf(value, 1)
}

function halfOf(value: string, half: 0 | 1): string {
  for (let at = lightDarkAt(value); at !== -1; at = lightDarkAt(value)) {
    const start = at + 'light-dark('.length
    let depth = 0
    let comma = -1
    let commas = 0
    let end = -1
    let quote = ''
    for (let i = start; i < value.length && end === -1; i++) {
      const c = value[i]
      if (quote) {
        if (c === '\\') {
          i++
        } else if (c === quote) {
          quote = ''
        }
      } else if (c === '"' || c === "'") {
        quote = c
      } else if (c === '(') {
        depth++
      } else if (c === ')') {
        if (depth === 0) {
          end = i
        } else {
          depth--
        }
      } else if (c === ',' && depth === 0) {
        commas++
        if (comma === -1) {
          comma = i
        }
      }
    }
    // Only a well-formed `light-dark(a, b)` — exactly two, non-empty arguments — is reduced. Anything
    // else (`light-dark(red`, `light-dark(, blue)`, `light-dark(red, )`, `light-dark(red, blue, green)`)
    // is left as it stands, which resolveTokens then refuses.
    if (
      end === -1 ||
      commas !== 1 ||
      value.slice(start, comma).trim() === '' ||
      value.slice(comma + 1, end).trim() === ''
    ) {
      return value
    }
    const chosen = half === 0 ? value.slice(start, comma) : value.slice(comma + 1, end)
    value = value.slice(0, at) + chosen.trim() + value.slice(end + 1)
  }
  return value
}

/**
 * Where a `light-dark(` stands outside a quoted string, or -1. A font called `'light-dark('` is a
 * name, not a function.
 */
export function lightDarkAt(value: string): number {
  let quote = ''
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (quote) {
      if (c === '\\') {
        i++
      } else if (c === quote) {
        quote = ''
      }
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (value.startsWith('light-dark(', i)) {
      return i
    }
  }
  return -1
}

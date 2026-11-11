// light-dark() is understood by Chrome 123, Firefox 120 and Safari 17.5. A browser older than that
// keeps the custom properties (they accept any tokens) but drops every declaration that READS one —
// no text colour, no background, no border, in either theme. For those browsers this plugin adds
// the same custom properties with each half of every pair, inside
// `@supports not (color: light-dark(red, blue))`; a current browser skips the whole block:
//
//   :root                          the light halves   — the default
//   :root[data-theme='dark']       the dark halves    — the user chose dark
//   @media (prefers-color-scheme: dark) { :root[data-theme='system'], :root:not([data-theme]) }
//                                  the dark halves    — "system", and the device is dark
//
// That is the decision theme-dark.css makes for a current browser with `color-scheme`, written out for
// one that cannot. A browser without prefers-color-scheme (before 2019) follows the cookie only.
//
// color-mix() (Chrome 111) is older than light-dark() (Chrome 123), but a browser can lack both: a token that mixes
// gets its mix taken out under `@supports not (color: color-mix(…))`. A pair: the same three blocks once
// more inside the block above. Any other token: one `:root` block of its own. See withoutColorMix.
//
// The pairs stay one declaration in the source (see theme-dark.css); this is only the fallback.
// A brand's `:root:root` colour replaces the pair in both themes in a current browser. So no block here
// may be MORE specific than `:root:root` (0,2,0): both system selectors are 0,2,0, so a brand loaded
// later wins, as it does there. The app only ever sets 'system', 'light' or 'dark' (utils/theme.js);
// no `:not()` list, which Chrome before 88 would drop.

// One parser for the whole project (packages/branding); the plugin is CommonJS and so is its dist.
const { lightOf, darkOf } = require('@ocelot-social/branding')

const SUPPORTS = 'not (color: light-dark(red, blue))'
const SUPPORTS_MIX = 'not (color: color-mix(in srgb, red, blue))'

// color-mix(in <space>, A, B …) without color-mix: its first colour, A; a tint (B is transparent): none. A browser that has neither
// light-dark() (Chrome 123) nor color-mix() (Chrome 111) would otherwise take the declaration that reads
// the token as invalid and paint nothing. The first colour is the one that is mixed from, so it is the
// brand's own, only not darkened.
function withoutColorMix(value) {
  for (;;) {
    const at = value.indexOf('color-mix(')
    if (at === -1) return value
    const open = at + 'color-mix('.length
    let depth = 1
    let end = open
    let comma = -1
    let second = -1
    for (; end < value.length && depth; end++) {
      const ch = value[end]
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ',' && depth === 1) {
        if (comma === -1) comma = end
        else if (second === -1) second = end
      }
    }
    // end is one past the closing parenthesis; no second comma means the mix has one colour only
    const colour = (from, to) =>
      value
        .slice(from, to)
        .trim()
        .replace(/^[\d.]+%\s+|\s+[\d.]+%$/g, '')
    const first = colour(comma + 1, second === -1 ? end - 1 : second)
    // A tint (`color-mix(…, X 14%, transparent)`) is a hint of a colour, not the colour: without the
    // function it is no colour at all.
    const tint = second !== -1 && colour(second + 1, end - 1) === 'transparent'
    value = value.slice(0, at) + (tint ? 'transparent' : first) + value.slice(end)
  }
}

module.exports = () => ({
  postcssPlugin: 'ocelot-light-dark-fallback',
  Once(root, { AtRule, Rule, Declaration }) {
    const light = new Map()
    const dark = new Map()
    const mixOnly = new Map()
    root.walkRules(':root', (rule) => {
      if (rule.parent.type !== 'root') return
      rule.walkDecls(/^--/, (decl) => {
        if (!decl.value.includes('light-dark(')) {
          if (decl.value.includes('color-mix(')) mixOnly.set(decl.prop, withoutColorMix(decl.value))
          return
        }
        light.set(decl.prop, lightOf(decl.value))
        dark.set(decl.prop, darkOf(decl.value))
      })
    })
    // A token that mixes and is no pair: the same without the mix, for a browser before color-mix().
    const appendMixOnly = () => {
      if (!mixOnly.size) return
      const noMix = new AtRule({ name: 'supports', params: SUPPORTS_MIX })
      const rule = new Rule({ selector: ':root' })
      for (const [prop, value] of mixOnly) rule.append(new Declaration({ prop, value }))
      root.append(noMix.append(rule))
    }
    if (!light.size) return appendMixOnly()
    const block = (selector, values) => {
      const rule = new Rule({ selector })
      for (const [prop, value] of values) rule.append(new Declaration({ prop, value }))
      return rule
    }
    const supports = new AtRule({ name: 'supports', params: SUPPORTS })
    supports.append(block(':root', light))
    supports.append(block(":root[data-theme='dark']", dark))
    supports.append(
      new AtRule({ name: 'media', params: '(prefers-color-scheme: dark)' }).append(
        block(":root[data-theme='system'], :root:not([data-theme])", dark),
      ),
    )
    // A pair that mixes: the same three blocks again with the mixes taken out, for the years between
    // the two functions. After the blocks above, so on equal specificity it wins.
    const mixed = [...light.keys()].filter(
      (prop) => light.get(prop).includes('color-mix(') || dark.get(prop).includes('color-mix('),
    )
    if (mixed.length) {
      const plain = (map) => new Map(mixed.map((prop) => [prop, withoutColorMix(map.get(prop))]))
      const noMix = new AtRule({ name: 'supports', params: SUPPORTS_MIX })
      noMix.append(block(':root', plain(light)))
      noMix.append(block(":root[data-theme='dark']", plain(dark)))
      noMix.append(
        new AtRule({ name: 'media', params: '(prefers-color-scheme: dark)' }).append(
          block(":root[data-theme='system'], :root:not([data-theme])", plain(dark)),
        ),
      )
      supports.append(noMix)
    }
    root.append(supports)
    appendMixOnly()
  },
})
module.exports.postcss = true

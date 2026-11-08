// light-dark() is understood by Chrome 123, Firefox 120 and Safari 17.5. A browser older than that
// keeps the custom properties (they accept any tokens) but drops every declaration that READS one —
// no text colour, no background, no border, in the light theme too. For those browsers this plugin
// adds, after the :root rule, the same custom properties with the LIGHT half of each pair, inside
// `@supports not (color: light-dark(red, blue))`: they get the light theme, never the dark one, and
// a current browser skips the block.
//
// The pairs stay one declaration in the source (see theme-dark.css); this is only the fallback.

const SUPPORTS = 'not (color: light-dark(red, blue))'

/** The first argument of every light-dark(a, b) in `value`, the rest of the value untouched. */
function lightHalf(value) {
  let out = ''
  let i = 0
  const start = 'light-dark('
  for (;;) {
    const at = value.indexOf(start, i)
    if (at === -1) return out + value.slice(i)
    out += value.slice(i, at)
    let depth = 1
    let j = at + start.length
    let comma = -1
    for (; j < value.length && depth > 0; j += 1) {
      const c = value[j]
      if (c === '(') depth += 1
      else if (c === ')') depth -= 1
      else if (c === ',' && depth === 1 && comma === -1) comma = j
    }
    // An unbalanced or comma-less call is left as it is rather than guessed at.
    if (depth !== 0 || comma === -1) return out + value.slice(at)
    out += lightHalf(value.slice(at + start.length, comma).trim())
    i = j
  }
}

module.exports = () => ({
  postcssPlugin: 'ocelot-light-dark-fallback',
  Once(root, { AtRule, Rule, Declaration }) {
    const fallback = new Map()
    root.walkRules(':root', (rule) => {
      if (rule.parent.type !== 'root') return
      rule.walkDecls(/^--/, (decl) => {
        if (decl.value.includes('light-dark(')) fallback.set(decl.prop, lightHalf(decl.value))
      })
    })
    if (!fallback.size) return
    const block = new Rule({ selector: ':root' })
    for (const [prop, value] of fallback) block.append(new Declaration({ prop, value }))
    root.append(new AtRule({ name: 'supports', params: SUPPORTS }).append(block))
  },
})
module.exports.postcss = true
module.exports.lightHalf = lightHalf

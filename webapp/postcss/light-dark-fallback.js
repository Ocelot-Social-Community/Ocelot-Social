// light-dark() is understood by Chrome 123, Firefox 120 and Safari 17.5. A browser older than that
// keeps the custom properties (they accept any tokens) but drops every declaration that READS one —
// no text colour, no background, no border, in either theme. For those browsers this plugin adds
// the same custom properties with each half of every pair, inside
// `@supports not (color: light-dark(red, blue))`; a current browser skips the whole block:
//
//   :root                          the light halves   — the default
//   :root[data-theme='dark']       the dark halves    — the user chose dark
//   @media (prefers-color-scheme: dark) { :root:not([data-theme='light']):not([data-theme='dark']) }
//                                  the dark halves    — "system", and the device is dark
//
// That is the decision theme-dark.css makes for a current browser with `color-scheme`, written out for
// one that cannot. A browser without prefers-color-scheme (before 2019) follows the cookie only.
//
// The pairs stay one declaration in the source (see theme-dark.css); this is only the fallback.
// Known limit: a brand's `:root:root` colour is as specific as the dark block and wins only by being
// loaded later; in a current browser it replaces the pair in both themes by construction.

// One parser for the whole project (packages/branding); the plugin is CommonJS and so is its dist.
const { lightOf, darkOf } = require('@ocelot-social/branding')

const SUPPORTS = 'not (color: light-dark(red, blue))'

module.exports = () => ({
  postcssPlugin: 'ocelot-light-dark-fallback',
  Once(root, { AtRule, Rule, Declaration }) {
    const light = new Map()
    const dark = new Map()
    root.walkRules(':root', (rule) => {
      if (rule.parent.type !== 'root') return
      rule.walkDecls(/^--/, (decl) => {
        if (!decl.value.includes('light-dark(')) return
        light.set(decl.prop, lightOf(decl.value))
        dark.set(decl.prop, darkOf(decl.value))
      })
    })
    if (!light.size) return
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
        block(":root:not([data-theme='light']):not([data-theme='dark'])", dark),
      ),
    )
    root.append(supports)
  },
})
module.exports.postcss = true

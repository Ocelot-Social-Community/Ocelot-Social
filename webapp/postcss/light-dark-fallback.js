// light-dark() is understood by Chrome 123, Firefox 120 and Safari 17.5. A browser older than that
// keeps the custom properties (they accept any tokens) but drops every declaration that READS one —
// no text colour, no background, no border, in the light theme too. For those browsers this plugin
// adds, after the :root rule, the same custom properties with the LIGHT half of each pair, inside
// `@supports not (color: light-dark(red, blue))`: they get the light theme, never the dark one, and
// a current browser skips the block.
//
// The pairs stay one declaration in the source (see theme-dark.css); this is only the fallback.

// One parser for the whole project (packages/branding); the plugin is CommonJS and so is its dist.
const { lightOf } = require('@ocelot-social/branding')

const SUPPORTS = 'not (color: light-dark(red, blue))'

module.exports = () => ({
  postcssPlugin: 'ocelot-light-dark-fallback',
  Once(root, { AtRule, Rule, Declaration }) {
    const fallback = new Map()
    root.walkRules(':root', (rule) => {
      if (rule.parent.type !== 'root') return
      rule.walkDecls(/^--/, (decl) => {
        if (decl.value.includes('light-dark(')) fallback.set(decl.prop, lightOf(decl.value))
      })
    })
    if (!fallback.size) return
    const block = new Rule({ selector: ':root' })
    for (const [prop, value] of fallback) block.append(new Declaration({ prop, value }))
    root.append(new AtRule({ name: 'supports', params: SUPPORTS }).append(block))
  },
})
module.exports.postcss = true

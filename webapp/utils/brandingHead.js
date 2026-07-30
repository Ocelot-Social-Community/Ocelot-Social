// The runtime-branding <head> assets, built as pure strings so the SERVER and the CLIENT emit exactly
// the same markup:
//   • SSR    — nuxt.config.js hooks['vue-renderer:ssr:templateParams'] appends brandingHeadHtml() to
//              the rendered HEAD, so the very first paint is already branded.
//   • client — plugins/branding-head.js applies the same values to the DOM (for a brand that is only
//              known client-side, and as the no-op re-check after hydration).
//
// WHY THE SSR SIDE IS A TEMPLATE HOOK AND NOT vue-meta: Nuxt assembles the head as
// `meta.link + meta.style + … + renderResourceHints() + renderStyles()`
// (@nuxt/vue-renderer/dist/vue-renderer.js). Everything vue-meta contributes therefore lands BEFORE
// the app's CSS bundles — and both `:root { --color-primary }` (assets/_new/styles/ocelot-ui-
// variables.scss) and the framework component rules would then win over the brand on equal
// specificity, i.e. the theme would not apply at all. The templateParams hook runs after
// renderStyles(), which puts these tags at the END of <head> — the same position the client plugin
// appends them to, so one cascade for both paths.
//
// NOT handled here: the favicon. The client plugin retargets the <link rel="icon"> that nuxt.config
// already renders; emitting a second one from SSR would leave two competing icon links.

// Defense-in-depth against CSS injection: brand theme values are interpolated into a generated CSS
// string (@font-face / :root). A value containing `'`, `;`, `{` or `}` could otherwise break out of the
// string/rule block and inject arbitrary CSS (hide UI, phishing overlays). Brand configs are admin-
// managed AND the package schema does NOT validate these free-form values (theme.cssVars is an open
// map), so this strips the breakout characters here. Legit values (colors, `rgb()`, `10px`, `1px solid
// red`, …) keep every character they need; only string/block delimiters are removed.
export const cssSafeValue = (value) => String(value).replace(/["'`;{}\\<>\r\n]/g, '')
// A CSS custom-property / identifier name: letters, digits, hyphen only.
export const cssSafeIdent = (name) => String(name).replace(/[^a-zA-Z0-9-]/g, '')

// The id / marker attribute both paths use, so each recognises what the other already emitted and
// nothing is applied twice.
export const THEME_STYLE_ID = 'branding-theme'
export const CSS_LINK_ATTR = 'data-branding-css'

// An href going into a double-quoted HTML attribute. The values are framework-generated
// (/branding/<id>/…) rather than free text, but they are still brand-supplied config.
const htmlAttr = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// `:root:root`, not `:root`. The framework's own custom-property defaults live in a plain
// `:root { … }` (assets/_new/styles/ocelot-ui-variables.scss), so on EQUAL specificity the later rule
// wins — and where the app CSS ends up relative to this block is not something we control: with
// Nuxt 2's default `build.extractCSS: false` the bundle is injected by vue-style-loader at runtime,
// i.e. AFTER anything the server rendered into <head>. A brand's `--color-secondary-active` was then
// silently overwritten by the vanilla value again (reformer's grey footer rendered ocelot blue).
// Repeating the selector raises specificity to (0,2,0) without changing what it matches, so the brand
// wins wherever this block lands — SSR or client, dev or production.
const THEME_SELECTOR = ':root:root'

/**
 * The content of the <style id="branding-theme"> element: the brand's @font-face declarations plus its
 * CSS custom properties on the root element. Empty string when the brand customises neither — the
 * caller then emits no element at all, so a vanilla render stays byte-identical to before.
 */
export function themeCss(theme) {
  const cssVars = (theme && theme.cssVars) || {}
  const fontFaces = (theme && theme.fontFaces) || []
  if (!Object.keys(cssVars).length && !fontFaces.length) return ''
  const faces = fontFaces
    .map((f) => {
      const format = f.format ? ` format('${cssSafeValue(f.format)}')` : ''
      const weight = f.weight ? ` font-weight: ${cssSafeValue(f.weight)};` : ''
      const style = f.style ? ` font-style: ${cssSafeValue(f.style)};` : ''
      return `@font-face { font-family: '${cssSafeValue(f.family)}'; src: url('${cssSafeValue(
        f.src,
      )}')${format};${weight}${style} }`
    })
    .join('\n')
  const vars = Object.entries(cssVars)
    .map(([key, value]) => `--${cssSafeIdent(key)}: ${cssSafeValue(value)};`)
    .join(' ')
  return `${faces}\n${THEME_SELECTOR} { ${vars} }`
}

/** The brand's extra stylesheets (branding.assets.css), already namespaced to /branding/<id>/…. */
export function brandingCssHrefs(branding) {
  const css = (branding && branding.assets && branding.assets.css) || []
  return css.filter(Boolean)
}

/**
 * The SSR markup: the brand's stylesheet <link>s followed by its theme <style>. The order mirrors what
 * the client plugin appends, so a page rendered on the server and one branded on the client resolve
 * the cascade identically.
 */
export function brandingHeadHtml(branding) {
  const links = brandingCssHrefs(branding)
    .map(
      (href) =>
        `<link rel="stylesheet" href="${htmlAttr(href)}" ${CSS_LINK_ATTR}="${htmlAttr(href)}">`,
    )
    .join('')
  const css = themeCss(branding && branding.theme)
  const style = css ? `<style id="${THEME_STYLE_ID}">${css}</style>` : ''
  return `${links}${style}`
}

// Dynamic branding <head> assets (client). The favicon and any extra stylesheets/fonts a brand
// ships are referenced as data in branding.assets (namespaced to /branding/<id>/… and served by
// the branding-assets middleware). They are applied here on the client rather than baked into the
// static nuxt.config head, so a runtime-injected brand (see plugins/branding.js) sets its own icon
// and CSS without a rebuild. (SSR keeps the default /favicon.ico; the client swaps to the brand's.)
import { branding } from '@ocelot-social/branding'

// Defense-in-depth against CSS injection: brand theme values are interpolated into a generated CSS
// string (@font-face / :root). A value containing `'`, `;`, `{` or `}` could otherwise break out of the
// string/rule block and inject arbitrary CSS (hide UI, phishing overlays). Brand configs are admin-
// managed AND the package schema does NOT validate these free-form values (theme.cssVars is an open
// map), so this strips the breakout characters here. Legit values (colors, `rgb()`, `10px`, `1px solid
// red`, …) keep every character they need; only string/block delimiters are removed.
const cssSafeValue = (value) => String(value).replace(/["'`;{}\\<>\r\n]/g, '')
// A CSS custom-property / identifier name: letters, digits, hyphen only.
const cssSafeIdent = (name) => String(name).replace(/[^a-zA-Z0-9-]/g, '')

export default () => {
  if (typeof document === 'undefined') return
  const assets = branding.assets || {}

  if (assets.favicon) {
    let link = document.querySelector('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = assets.favicon
  }

  for (const href of assets.css || []) {
    if (!href || document.querySelector(`link[data-branding-css="${href}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-branding-css', href)
    document.head.appendChild(link)
  }

  // Runtime theme: brand @font-face declarations + CSS custom property overrides on :root. Both the
  // webapp (brandable SCSS tokens read var(--…)) and packages/ui (reads var(--color-*)) pick these
  // up, so a live switch re-themes without a rebuild. Client-side only: SSR keeps the built (vanilla)
  // theme, the brand's values apply on mount — a brief flash on first load, acceptable for a rare
  // admin switch (an SSR-injected <style> would remove it — see the concept's theme layer).
  const theme = branding.theme || {}
  const cssVars = theme.cssVars || {}
  const fontFaces = theme.fontFaces || []
  if (Object.keys(cssVars).length || fontFaces.length) {
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
    let style = document.getElementById('branding-theme')
    if (!style) {
      style = document.createElement('style')
      style.id = 'branding-theme'
      document.head.appendChild(style)
    }
    style.textContent = `${faces}\n:root { ${vars} }`
  }
}

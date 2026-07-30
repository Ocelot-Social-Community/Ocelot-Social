// Dynamic branding <head> assets (client). The favicon and any extra stylesheets/fonts a brand
// ships are referenced as data in branding.assets (namespaced to /branding/<id>/… and served by
// the branding-assets middleware). The markup itself is built by utils/brandingHead.js, which the
// SSR hook (nuxt.config.js → 'vue-renderer:ssr:templateParams') uses too — so a server-rendered page
// arrives ALREADY branded and this plugin finds its own tags in place and does nothing. It still
// matters for a brand that only becomes known on the client, and it keeps the favicon (the one thing
// SSR deliberately leaves alone — see brandingHead.js).
import { branding } from '@ocelot-social/branding'

import { CSS_LINK_ATTR, THEME_STYLE_ID, brandingCssHrefs, themeCss } from '~/utils/brandingHead.js'

export default () => {
  if (typeof document === 'undefined') return
  const assets = branding.assets || {}

  // Retargets the <link rel="icon"> nuxt.config already renders, rather than adding a second one —
  // which is why the SSR side skips the favicon and only this path sets it.
  if (assets.favicon) {
    let link = document.querySelector('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = assets.favicon
  }

  // Reuse the <link> the SSR hook emitted rather than adding a second one, but ALWAYS re-append: a
  // brand's own rules mostly match framework selectors on equal specificity and win by being last,
  // and with `build.extractCSS: false` (Nuxt 2's default) the app CSS is injected by vue-style-loader
  // during hydration — after everything the server put in <head>. appendChild MOVES an existing node,
  // so this restores the end-of-head position for both paths without re-fetching the stylesheet.
  for (const href of brandingCssHrefs(branding)) {
    let link = document.querySelector(`link[${CSS_LINK_ATTR}="${href}"]`)
    if (!link) {
      link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.setAttribute(CSS_LINK_ATTR, href)
    }
    document.head.appendChild(link)
  }

  // Runtime theme: brand @font-face declarations + CSS custom property overrides on the root element.
  // Both the webapp (brandable SCSS tokens read var(--…)) and packages/ui read these, so a live switch
  // re-themes without a rebuild. Re-appended last for the same reason as the stylesheets above —
  // though the theme block does not depend on it: themeCss() out-specifies the framework defaults.
  const css = themeCss(branding.theme)
  if (css) {
    let style = document.getElementById(THEME_STYLE_ID)
    if (!style) {
      style = document.createElement('style')
      style.id = THEME_STYLE_ID
    }
    style.textContent = css
    document.head.appendChild(style)
  }
}

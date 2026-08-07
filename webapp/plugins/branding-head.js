// Dynamic branding <head> assets (client). The extra stylesheets and fonts a brand ships are
// referenced as data in branding.assets (namespaced to /branding/<id>/… and served by the
// branding-assets middleware). The markup itself is built by utils/brandingHead.js, which the SSR
// hook (nuxt.config.js → 'vue-renderer:ssr:templateParams') uses too — so a server-rendered page
// arrives ALREADY branded and this plugin finds its own tags in place and does nothing. It still
// matters for a brand that only becomes known on the client, and for re-appending the tags after
// vue-style-loader injects the app CSS during hydration (see below).
//
// NOT the favicon: that is a vue-meta slot now (plugins/branding-favicon.js), which brands it on the
// server too instead of retargeting a vanilla link after hydration.
import { branding } from '@ocelot-social/branding'

import { CSS_LINK_ATTR, brandingCssHrefs } from '~/utils/brandingHead.js'

export default () => {
  if (typeof document === 'undefined') return

  // Reuse the <link> the SSR hook emitted rather than adding a second one, but ALWAYS re-append: a
  // brand's own rules mostly match framework selectors on equal specificity and win by being last,
  // and with `build.extractCSS: false` (Nuxt 2's default) the app CSS is injected by vue-style-loader
  // during hydration — after everything the server put in <head>. appendChild MOVES an existing node,
  // so this restores the end-of-head position for both paths without re-fetching the stylesheet.
  //
  // The already-rendered links are indexed by their attribute VALUE rather than looked up with a
  // `link[…="${href}"]` selector: an href is brand-authored config (assets.css is an unvalidated
  // string[]), and a single `"` in it would make that selector invalid — querySelector throws a
  // DOMException, which would abort this plugin before the theme block below ever runs. Same
  // defense-in-depth reasoning as the CSS sanitizers in utils/brandingHead.js.
  const rendered = new Map(
    [...document.head.querySelectorAll(`link[${CSS_LINK_ATTR}]`)].map((el) => [
      el.getAttribute(CSS_LINK_ATTR),
      el,
    ]),
  )
  for (const href of brandingCssHrefs(branding)) {
    let link = rendered.get(href)
    if (!link) {
      link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.setAttribute(CSS_LINK_ATTR, href)
    }
    document.head.appendChild(link)
  }

  // No separate theme <style> any more: a brand's custom properties live in its own stylesheet, which
  // the links above already carry. The build raises that sheet's `:root` to `:root:root`, so the tokens
  // win on specificity — the re-append above then only has to matter for its component rules.
}

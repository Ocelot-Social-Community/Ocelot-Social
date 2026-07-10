// Dynamic branding <head> assets (client). The favicon and any extra stylesheets/fonts a brand
// ships are referenced as data in branding.assets (namespaced to /branding/<id>/… and served by
// the branding-assets middleware). They are applied here on the client rather than baked into the
// static nuxt.config head, so a runtime-injected brand (see plugins/branding.js) sets its own icon
// and CSS without a rebuild. (SSR keeps the default /favicon.ico; the client swaps to the brand's.)
import branding from '@ocelot-social/branding'

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
}

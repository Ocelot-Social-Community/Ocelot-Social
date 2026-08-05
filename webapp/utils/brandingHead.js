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
// the app's CSS bundles — and both `:root { --color-primary }` (assets/css/ocelot-ui-
// variables.css) and the framework component rules would then win over the brand on equal
// specificity, i.e. the theme would not apply at all. The templateParams hook runs after
// renderStyles(), which puts these tags at the END of <head> — the same position the client plugin
// appends them to, so one cascade for both paths.
//
// NOT handled here: the favicon. The client plugin retargets the <link rel="icon"> that nuxt.config
// already renders; emitting a second one from SSR would leave two competing icon links.

// The marker attribute both paths use, so each recognises what the other already emitted and
// nothing is applied twice.
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
// `:root { … }` (assets/css/ocelot-ui-variables.css), so on EQUAL specificity the later rule
// wins — and where the app CSS ends up relative to this block is not something we control: with
// Nuxt 2's default `build.extractCSS: false` the bundle is injected by vue-style-loader at runtime,
// i.e. AFTER anything the server rendered into <head>. A brand's `--color-secondary-active` was then
// silently overwritten by the vanilla value again (reformer's grey footer rendered ocelot blue).
/** The brand's extra stylesheets (branding.assets.css), already namespaced to /branding/<id>/…. */
export function brandingCssHrefs(branding) {
  const css = (branding && branding.assets && branding.assets.css) || []
  return css.filter(Boolean)
}

/**
 * The SSR markup: the brand's stylesheet <link>s. There is no separate theme <style> any more — the
 * brand's own stylesheet carries its `:root:root` custom properties (the build raises the selector when
 * packing), so one mechanism covers tokens, fonts and component rules alike.
 */
export function brandingHeadHtml(branding) {
  const links = brandingCssHrefs(branding)
    .map(
      (href) =>
        `<link rel="stylesheet" href="${htmlAttr(href)}" ${CSS_LINK_ATTR}="${htmlAttr(href)}">`,
    )
    .join('')
  return links
}

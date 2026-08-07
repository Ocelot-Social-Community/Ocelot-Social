// The SSR half of the runtime branding: nuxt.config's 'vue-renderer:ssr:templateParams' hook is what
// puts a brand's theme and stylesheets into the FIRST paint. Without it the page rendered vanilla and
// only switched after hydration. The hook is plain config — unit-testable without booting Nuxt.
import config from './nuxt.config.js'
import { brandingHeadHtml } from './utils/brandingHead.js'

const BRAND = {
  assets: { css: ['/branding/acme/assets/css/branding.css'] },
  theme: { themeColor: 'rgb(1, 2, 3)' },
}

const render = (nuxtState) => {
  // What @nuxt/vue-renderer hands the hook: HEAD already assembled, ending with the app's CSS bundles
  // (renderStyles()). Everything the hook appends therefore comes after them in the cascade.
  const templateParams = { HEAD: '<link rel="stylesheet" href="/_nuxt/app.css">' }
  config.hooks['vue-renderer:ssr:templateParams'](templateParams, { nuxt: nuxtState })
  return templateParams.HEAD
}

describe('nuxt.config ssr branding head hook', () => {
  it('appends the brand markup after the app stylesheets', () => {
    const head = render({ branding: BRAND })

    expect(head).toContain(brandingHeadHtml(BRAND))
    // AFTER the bundle: the brand's stylesheet carries rules that match framework selectors on equal
    // specificity, so losing this order means the brand's component rules silently do not apply.
    // (Its theme TOKENS survive either way — the build ships them as `:root:root`.)
    expect(head.indexOf('/_nuxt/app.css')).toBeLessThan(head.indexOf('data-branding-css'))
  })

  it('leaves the head untouched for a vanilla render', () => {
    expect(render({})).toBe('<link rel="stylesheet" href="/_nuxt/app.css">')
    expect(render(undefined)).toBe('<link rel="stylesheet" href="/_nuxt/app.css">')
  })
})

// The head slots plugins/branding-favicon.js writes into. It rewrites the entry carrying `hid: 'icon'`
// and adds nothing of its own, so these declarations are half of that contract — drop the hid, or let
// @nuxtjs/pwa push a competing icon link again, and a branded instance silently falls back to the
// vanilla ocelot icon. Neither failure shows up in the plugin's own tests.
describe('nuxt.config head icons', () => {
  const links = (rel) => config.head.link.filter((link) => link.rel === rel)

  it('declares the favicon as a hid slot the branding plugin can rewrite', () => {
    expect(links('icon')).toEqual([
      { hid: 'icon', rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ])
  })

  // The pwa meta module only skips its own push when a link with this exact `rel` is already declared
  // (lib/meta/module.js), and what it pushes is hashed at build time and carries no hid — unbrandable.
  it('declares the apple-touch-icon itself rather than leaving it to @nuxtjs/pwa', () => {
    expect(links('apple-touch-icon')).toEqual([
      { hid: 'apple-touch-icon', rel: 'apple-touch-icon', href: '/icon.png' },
    ])
  })

  // `rel="shortcut icon"` is a legacy alias of `rel="icon"`, so that module's build-time PNG competed
  // with the brand's favicon for the tab. Disabling the icon submodule is what stops it being emitted.
  it('disables the pwa icon submodule that emitted the competing shortcut icon', () => {
    expect(config.pwa.icon).toBe(false)
  })

  it('keeps exactly one manifest link, pointing at the per-brand middleware route', () => {
    expect(links('manifest')).toEqual([{ rel: 'manifest', href: '/manifest.webmanifest' }])
  })
})

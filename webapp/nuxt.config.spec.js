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

// The other half of that contract, and the half nothing else can catch: branding-favicon.js reads the
// runtime accessor at plugin-EXECUTION time, and plugins/branding.js is what sets it. Nuxt runs the
// list in order and awaits the async one, so reordering these two costs nothing at build time and
// leaves every brand on the vanilla icon at run time — on deployments with a brand archive only, i.e.
// never on a developer's machine.
describe('nuxt.config branding plugin order', () => {
  // Entries are either a bare path or `{ src, ssr | mode }`; both forms are in this list.
  const entryFor = (src) =>
    config.plugins.map((p) => (typeof p === 'string' ? { src: p } : p)).find((p) => p.src === src)
  const indexOf = (src) =>
    config.plugins.findIndex((p) => (typeof p === 'string' ? p : p.src) === src)

  it('registers branding-favicon.js after the branding.js that sets the accessor', () => {
    const branding = indexOf('~/plugins/branding.js')
    const favicon = indexOf('~/plugins/branding-favicon.js')

    // Asserted separately: `favicon > branding` alone also holds when branding.js is absent (-1),
    // which is the more thorough way to break the same thing.
    expect(branding).toBeGreaterThanOrEqual(0)
    expect(favicon).toBeGreaterThan(branding)
  })

  // Both render paths on purpose. Restricting this one to the client would put the vanilla icon in the
  // server's first byte and swap it after hydration — the exact behaviour the hid slot removed.
  it('leaves branding-favicon.js running on the server as well as the client', () => {
    const entry = entryFor('~/plugins/branding-favicon.js')

    expect(entry).toBeDefined()
    expect(entry.ssr).not.toBe(false)
    expect(entry.mode).not.toBe('client')
  })
})

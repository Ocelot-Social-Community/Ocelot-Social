// The SSR half of the runtime branding: nuxt.config's 'vue-renderer:ssr:templateParams' hook is what
// puts a brand's theme and stylesheets into the FIRST paint. Without it the page rendered vanilla and
// only switched after hydration. The hook is plain config — unit-testable without booting Nuxt.
import config from './nuxt.config.js'
import { brandingHeadHtml } from './utils/brandingHead.js'

const BRAND = {
  assets: { css: ['/branding/acme/assets/css/branding.css'] },
  theme: { cssVars: { 'color-primary': 'rgb(1, 2, 3)' } },
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
    // AFTER the bundle: `:root { --color-primary }` from ocelot-ui-variables.scss has the same
    // specificity, so losing this order means the brand theme silently does not apply.
    expect(head.indexOf('/_nuxt/app.css')).toBeLessThan(head.indexOf('branding-theme'))
  })

  it('leaves the head untouched for a vanilla render', () => {
    expect(render({})).toBe('<link rel="stylesheet" href="/_nuxt/app.css">')
    expect(render(undefined)).toBe('<link rel="stylesheet" href="/_nuxt/app.css">')
  })
})

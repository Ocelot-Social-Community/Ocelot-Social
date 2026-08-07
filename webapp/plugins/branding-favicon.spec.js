// Same hoisting constraint as branding-head.spec.js: a plain `const` with a PURE initializer is the
// only shape babel-plugin-jest-hoist lifts together with the jest.mock call.
import brandingFavicon, { setIcon } from './branding-favicon.js'

const BRAND = {
  assets: { favicon: '/branding/acme/assets/favicon.ico', icon: '/branding/acme/assets/icon.png' },
}

jest.mock('@ocelot-social/branding', () => ({ branding: BRAND }))

// The head as nuxt.config declares it: the vanilla fallback the plugin is meant to overwrite.
const vanillaHead = () => ({
  link: [
    { hid: 'icon', rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { hid: 'apple-touch-icon', rel: 'apple-touch-icon', href: '/icon.png' },
    { rel: 'manifest', href: '/manifest.webmanifest' },
  ],
})

const icons = (head) => head.link.filter((l) => l.hid === 'icon')

describe('setIcon', () => {
  it('rewrites the declared slot instead of adding a second icon link', () => {
    const head = vanillaHead()

    setIcon(head.link, 'icon', '/branding/acme/assets/favicon.ico')

    expect(icons(head)).toEqual([
      { hid: 'icon', rel: 'icon', type: 'image/x-icon', href: '/branding/acme/assets/favicon.ico' },
    ])
  })

  it('replaces the fallback type rather than leaving a stale one behind', () => {
    const head = vanillaHead()

    setIcon(head.link, 'icon', '/branding/acme/assets/favicon.svg')

    expect(icons(head)[0].type).toBe('image/svg+xml')
  })

  it('drops the type for an extension it cannot vouch for', () => {
    const head = vanillaHead()

    setIcon(head.link, 'icon', '/branding/acme/assets/favicon')

    expect(icons(head)[0]).not.toHaveProperty('type')
  })

  it('adds the slot when nothing declared it', () => {
    const head = { link: [{ rel: 'manifest', href: '/manifest.webmanifest' }] }

    setIcon(head.link, 'icon', '/branding/acme/assets/favicon.ico')

    expect(icons(head)).toEqual([
      { hid: 'icon', rel: 'icon', type: 'image/x-icon', href: '/branding/acme/assets/favicon.ico' },
    ])
  })

  it('leaves the other head links alone', () => {
    const head = vanillaHead()

    setIcon(head.link, 'icon', '/branding/acme/assets/favicon.ico')

    expect(head.link.filter((l) => l.hid !== 'icon')).toEqual(vanillaHead().link.slice(1))
  })
})

describe('branding-favicon plugin', () => {
  const original = { ...BRAND.assets }
  afterEach(() => {
    BRAND.assets = { ...original }
  })

  it('brands both icons the head declares', () => {
    const app = { head: vanillaHead() }

    brandingFavicon({ app })

    expect(app.head.link).toEqual([
      { hid: 'icon', rel: 'icon', type: 'image/x-icon', href: '/branding/acme/assets/favicon.ico' },
      {
        hid: 'apple-touch-icon',
        rel: 'apple-touch-icon',
        type: 'image/png',
        href: '/branding/acme/assets/icon.png',
      },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ])
  })

  // iOS ignores an .ico, and .ico is what every brand ships as its favicon — so the apple-touch icon
  // has to come from its own slot. Pointing it at the favicon would look branded and render nothing.
  it('takes the apple-touch icon from assets.icon, never from the favicon', () => {
    BRAND.assets = { favicon: '/branding/acme/assets/favicon.ico' }
    const app = { head: vanillaHead() }

    brandingFavicon({ app })

    expect(app.head.link.find((l) => l.hid === 'apple-touch-icon').href).toBe('/icon.png')
  })

  // The slots are independent: a brand supplying only one must not cost the other its fallback.
  it('brands the apple-touch icon on its own when the brand ships no favicon', () => {
    BRAND.assets = { icon: '/branding/acme/assets/icon.png' }
    const app = { head: vanillaHead() }

    brandingFavicon({ app })

    expect(icons(app.head)[0].href).toBe('/favicon.ico')
    expect(app.head.link.find((l) => l.hid === 'apple-touch-icon').href).toBe(
      '/branding/acme/assets/icon.png',
    )
  })

  // Vanilla is not a degraded brand: nuxt.config's own icons have to survive untouched, or an
  // unbranded instance loses them.
  it.each([
    ['a brand with no assets at all', {}],
    ['empty paths', { favicon: '', icon: '' }],
    ['nulls', { favicon: null, icon: null }],
  ])('leaves the vanilla icons in place for %s', (_name, assets) => {
    BRAND.assets = assets
    const app = { head: vanillaHead() }

    brandingFavicon({ app })

    expect(app.head).toEqual(vanillaHead())
  })

  // The plugin runs before anything renders; throwing here would take the whole app down over a
  // favicon, so an unexpected head shape is a no-op rather than a crash.
  it.each([
    ['no head', {}],
    ['a head without links', { head: {} }],
    ['links that are not an array', { head: { link: null } }],
  ])('does not throw on %s', (_name, app) => {
    expect(() => brandingFavicon({ app })).not.toThrow()
  })

  it('does not throw without an app at all', () => {
    expect(() => brandingFavicon({})).not.toThrow()
  })
})

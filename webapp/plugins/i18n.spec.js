import { getBranding, setBranding } from '@ocelot-social/branding'
import { addTranslation } from './i18n.js'

// i18n.js pulls in ~/locales/html/ (raw .html imports jest can't transform) — stub it; addTranslation
// only reads htmlTranslations for translation.html, which these tests don't assert on.
jest.mock('~/locales/html/', () => ({ __esModule: true, default: {} }))

// addTranslation is the single merge path used by BOTH the initial load and the dynamic
// language-switch load, so testing it covers the branding-override behaviour for both.
describe('i18n addTranslation', () => {
  it('merges branding.locales over the base translation (brand strings win)', () => {
    const original = getBranding()
    setBranding({
      ...original,
      locales: { ...original.locales, en: { greeting: 'brand-hi' } },
    })
    try {
      const i18n = { add: jest.fn() }
      addTranslation({ i18n, locale: 'en', translation: { greeting: 'base-hi', other: 'x' } })
      const [locale, merged] = i18n.add.mock.calls[0]
      expect(locale).toBe('en')
      expect(merged.greeting).toBe('brand-hi') // branding override wins
      expect(merged.other).toBe('x') // base string preserved
    } finally {
      setBranding(original)
    }
  })

  it('passes the base translation through when the locale has no branding override', () => {
    const original = getBranding()
    // ensure no override for this locale
    setBranding({ ...original, locales: { ...original.locales, zz: undefined } })
    try {
      const i18n = { add: jest.fn() }
      addTranslation({ i18n, locale: 'zz', translation: { greeting: 'base-only' } })
      expect(i18n.add.mock.calls[0][1].greeting).toBe('base-only')
    } finally {
      setBranding(original)
    }
  })
})

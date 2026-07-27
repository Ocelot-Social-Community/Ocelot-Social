import { getBranding, setBranding } from '@ocelot-social/branding'
import links from './links.js'

describe('constants/links FOOTER_LINK_LIST', () => {
  it('drops footerOrder keys that are not known pages (no undefined → no PageFooter crash)', () => {
    const original = getBranding()
    // A runtime-editable brand config with a bogus/stale key mixed in with valid ones.
    setBranding({
      ...original,
      links: { ...original.links, footerOrder: ['imprint', 'does-not-exist', 'faq'] },
    })
    try {
      const list = links.FOOTER_LINK_LIST
      expect(list).toHaveLength(2) // the unknown key is dropped, the two valid ones remain
      expect(list.every((entry) => entry != null)).toBe(true)
    } finally {
      setBranding(original)
    }
  })
})

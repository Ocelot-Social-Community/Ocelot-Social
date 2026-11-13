import { MAP_STYLE_IDS, setBranding, defineBranding } from '@ocelot-social/branding'
import { MAP_STYLES, defaultMapStyleUrl } from './mapStyles'

describe('mapStyles', () => {
  it('offers outdoors, navigation-night, streets, satellite and dark, in that order', () => {
    expect(MAP_STYLES.map((style) => style.id)).toEqual([
      'outdoors',
      'navigation-night',
      'streets',
      'satellite',
      'dark',
    ])
  })

  it('offers exactly the ids a brand may choose as a default', () => {
    expect(MAP_STYLES.map((style) => style.id)).toEqual([...MAP_STYLE_IDS])
  })

  describe('defaultMapStyleUrl', () => {
    afterEach(() => setBranding(undefined))

    it('opens a light page on outdoors', () => {
      expect(defaultMapStyleUrl(false)).toBe('mapbox://styles/mapbox/outdoors-v12?optimize=true')
    })

    it('opens a dark page on outdoors too in vanilla', () => {
      expect(defaultMapStyleUrl(true)).toBe('mapbox://styles/mapbox/outdoors-v12?optimize=true')
    })

    it("takes a brand's choice for the light and for the dark theme", () => {
      setBranding(defineBranding({ map: { defaultStyle: { light: 'streets', dark: 'dark' } } }))
      expect(defaultMapStyleUrl(false)).toBe('mapbox://styles/mapbox/streets-v11?optimize=true')
      expect(defaultMapStyleUrl(true)).toBe('mapbox://styles/mapbox/dark-v10?optimize=true')
    })
  })
})

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

  it('opens a light page on outdoors', () => {
    expect(defaultMapStyleUrl(false)).toBe('mapbox://styles/mapbox/outdoors-v12?optimize=true')
  })

  it('opens a dark page on the night tiles', () => {
    expect(defaultMapStyleUrl(true)).toBe(
      'mapbox://styles/mapbox/navigation-night-v1?optimize=true',
    )
  })
})

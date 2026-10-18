import { MAPBOX_LABELLED_CONTROLS, MAPBOX_LOGO } from '@ocelot-social/ui/ocelot'
import { mapboxLocale } from './mapboxLocale'

describe('mapboxLocale', () => {
  const $t = (key) => `t(${key})`

  it("translates mapbox-gl's control tooltips", () => {
    expect(mapboxLocale($t)).toMatchObject({
      'NavigationControl.ZoomIn': 't(map.controls.zoomIn)',
      'NavigationControl.ZoomOut': 't(map.controls.zoomOut)',
      'NavigationControl.ResetBearing': 't(map.controls.resetBearing)',
      'FullscreenControl.Enter': 't(map.controls.enterFullscreen)',
      'FullscreenControl.Exit': 't(map.controls.exitFullscreen)',
      'GeolocateControl.FindMyLocation': 't(map.controls.findMyLocation)',
      'GeolocateControl.LocationNotAvailable': 't(map.controls.locationNotAvailable)',
      'AttributionControl.ToggleAttribution': 't(map.controls.toggleAttribution)',
      'AttributionControl.MapFeedback': 't(map.controls.mapFeedback)',
    })
  })

  it('names the logo for screen readers', () => {
    expect(mapboxLocale($t)).toMatchObject({
      'LogoControl.Title': 't(map.controls.logo)',
    })
  })
})

// setMapboxLocale (@ocelot-social/ui) relabels an open map by replacing `map._locale`, which is
// internal to mapbox-gl, and finds the controls by mapbox-gl's own class names. These tests hold
// that against the mapbox-gl this app ships, so an update that changes either fails here.
describe('the mapbox-gl this app ships', () => {
  const bundlePath = require.resolve('mapbox-gl/dist/mapbox-gl.js')
  const bundle = require('fs').readFileSync(bundlePath, 'utf8')

  it('still reads its UI strings from map._locale', () => {
    // mapbox-gl builds its worker from a blob URL as it loads, which jsdom does not provide.
    window.URL.createObjectURL = () => 'blob:mapbox-gl-worker'
    // The bundle itself: the test setup maps `mapbox-gl` to a stub.
    const mapboxgl = require('mapbox-gl/dist/mapbox-gl.js')
    const map = Object.create(mapboxgl.Map.prototype)
    map._locale = { 'NavigationControl.ZoomIn': 'Vergrößern' }

    expect(map._getUIString('NavigationControl.ZoomIn')).toBe('Vergrößern')
  })

  it('still knows every string id translated here', () => {
    const $t = (key) => key
    for (const id of Object.keys(mapboxLocale($t))) {
      expect(bundle).toContain(`"${id}":`)
    }
  })

  it('still labels the controls setMapboxLocale relabels, by the same class names and ids', () => {
    for (const { selector, ids } of [
      ...MAPBOX_LABELLED_CONTROLS,
      { ...MAPBOX_LOGO, ids: [MAPBOX_LOGO.id] },
    ]) {
      for (const className of selector.split(',').map((part) => part.trim().replace(/^\./, ''))) {
        expect(bundle).toContain(className)
      }
      for (const id of ids) {
        expect(bundle).toContain(`"${id}":`)
      }
    }
  })
})

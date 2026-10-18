import { describe, expect, it } from 'vitest'

import { MAPBOX_LABELLED_CONTROLS, setMapboxLocale } from './mapboxLocale'

const DEFAULTS = {
  'NavigationControl.ZoomIn': 'Zoom in',
  'NavigationControl.ZoomOut': 'Zoom out',
  'NavigationControl.ResetBearing': 'Reset bearing to north',
  'FullscreenControl.Enter': 'Enter fullscreen',
  'FullscreenControl.Exit': 'Exit fullscreen',
  'GeolocateControl.FindMyLocation': 'Find my location',
  'GeolocateControl.LocationNotAvailable': 'Location not available',
  'AttributionControl.ToggleAttribution': 'Toggle attribution',
  'AttributionControl.MapFeedback': 'Map feedback',
  'LogoControl.Title': 'Mapbox logo',
}

const GERMAN = {
  'NavigationControl.ZoomIn': 'Vergrößern',
  'NavigationControl.ZoomOut': 'Verkleinern',
  'NavigationControl.ResetBearing': 'Nach Norden ausrichten',
  'FullscreenControl.Enter': 'Vollbild',
  'FullscreenControl.Exit': 'Vollbild beenden',
  'GeolocateControl.FindMyLocation': 'Meinen Standort anzeigen',
  'GeolocateControl.LocationNotAvailable': 'Standort nicht verfügbar',
  'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
  'AttributionControl.MapFeedback': 'Feedback zur Karte',
  'LogoControl.Title': 'Mapbox-Logo',
}

/** A map with mapbox-gl's controls as they are rendered, labelled in English. */
function mapWith(markup: string) {
  const container = document.createElement('div')
  container.innerHTML = markup
  return { _locale: { ...DEFAULTS }, getContainer: () => container }
}

const labelOf = (map: ReturnType<typeof mapWith>, selector: string) => {
  const element = map.getContainer().querySelector(selector)
  return [element?.getAttribute('title'), element?.getAttribute('aria-label')]
}

describe(setMapboxLocale, () => {
  it('relabels the zoom, compass and attribution controls', () => {
    const map = mapWith(`
      <button class="mapboxgl-ctrl-zoom-in" title="Zoom in"></button>
      <button class="mapboxgl-ctrl-zoom-out" title="Zoom out"></button>
      <button class="mapboxgl-ctrl-compass" title="Reset bearing to north"></button>
      <button class="mapboxgl-ctrl-attrib-button" title="Toggle attribution"></button>
      <a class="mapbox-improve-map" title="Map feedback"></a>
    `)

    setMapboxLocale(map, GERMAN)

    expect(labelOf(map, '.mapboxgl-ctrl-zoom-in')).toStrictEqual(['Vergrößern', 'Vergrößern'])
    expect(labelOf(map, '.mapboxgl-ctrl-zoom-out')).toStrictEqual(['Verkleinern', 'Verkleinern'])
    expect(labelOf(map, '.mapboxgl-ctrl-compass')).toStrictEqual([
      'Nach Norden ausrichten',
      'Nach Norden ausrichten',
    ])
    expect(labelOf(map, '.mapboxgl-ctrl-attrib-button')[0]).toBe(
      'Quellenangaben ein- oder ausblenden',
    )
    expect(labelOf(map, '.mapbox-improve-map')[0]).toBe('Feedback zur Karte')
  })

  it('labels the fullscreen button by its state', () => {
    const entering = mapWith('<button class="mapboxgl-ctrl-fullscreen"></button>')
    const exiting = mapWith('<button class="mapboxgl-ctrl-shrink"></button>')

    setMapboxLocale(entering, GERMAN)
    setMapboxLocale(exiting, GERMAN)

    expect(labelOf(entering, 'button')[0]).toBe('Vollbild')
    expect(labelOf(exiting, 'button')[0]).toBe('Vollbild beenden')
  })

  it('labels the geolocate button by its state', () => {
    const available = mapWith('<button class="mapboxgl-ctrl-geolocate"></button>')
    const unavailable = mapWith('<button class="mapboxgl-ctrl-geolocate" disabled></button>')

    setMapboxLocale(available, GERMAN)
    setMapboxLocale(unavailable, GERMAN)

    expect(labelOf(available, 'button')[0]).toBe('Meinen Standort anzeigen')
    expect(labelOf(unavailable, 'button')[0]).toBe('Standort nicht verfügbar')
  })

  it('renames the logo for screen readers, which has no title', () => {
    const map = mapWith('<a class="mapboxgl-ctrl-logo" aria-label="Mapbox logo"></a>')

    setMapboxLocale(map, GERMAN)

    expect(labelOf(map, 'a')).toStrictEqual([null, 'Mapbox-Logo'])
  })

  it('leaves the table on the map, for the strings mapbox-gl sets later', () => {
    const map = mapWith('')

    setMapboxLocale(map, { 'FullscreenControl.Exit': 'Vollbild beenden' })

    expect(map._locale['FullscreenControl.Exit']).toBe('Vollbild beenden')
    expect(map._locale['FullscreenControl.Enter']).toBe('Enter fullscreen')
  })

  it('lists every id a control may be labelled with', () => {
    const states = [
      '<button class="mapboxgl-ctrl-shrink"></button>',
      '<button class="mapboxgl-ctrl-geolocate" disabled></button>',
      '<button></button>',
    ]
    for (const control of MAPBOX_LABELLED_CONTROLS) {
      for (const markup of states) {
        const element = mapWith(markup).getContainer().firstElementChild as Element

        expect(control.ids).toContain(control.idOf(element))
      }
    }
  })
})

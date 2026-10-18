/** mapbox-gl's UI strings by their ids, e.g. `NavigationControl.ZoomIn` — its `locale` map option. */
export type MapboxLocale = Record<string, string>

/** The part of a mapbox-gl map read and written here. */
interface MapboxMap {
  _locale: MapboxLocale
  getContainer: () => HTMLElement
}

/** A control element mapbox-gl labels itself: how to find it, and the string ids it may carry. */
export interface MapboxLabelledControl {
  /** CSS selector of the element in the map's container. */
  selector: string
  /** Every string id it is labelled with, in any state. */
  ids: string[]
  /** The id it is labelled with now, by its state. */
  idOf: (element: Element) => string
}

/**
 * The control elements `setMapboxLocale` relabels. Exported so a host app can check them against
 * the mapbox-gl version it ships (class names and string ids are mapbox-gl's own).
 */
export const MAPBOX_LABELLED_CONTROLS: MapboxLabelledControl[] = [
  {
    selector: '.mapboxgl-ctrl-zoom-in',
    ids: ['NavigationControl.ZoomIn'],
    idOf: () => 'NavigationControl.ZoomIn',
  },
  {
    selector: '.mapboxgl-ctrl-zoom-out',
    ids: ['NavigationControl.ZoomOut'],
    idOf: () => 'NavigationControl.ZoomOut',
  },
  {
    selector: '.mapboxgl-ctrl-compass',
    ids: ['NavigationControl.ResetBearing'],
    idOf: () => 'NavigationControl.ResetBearing',
  },
  {
    selector: '.mapboxgl-ctrl-fullscreen, .mapboxgl-ctrl-shrink',
    ids: ['FullscreenControl.Enter', 'FullscreenControl.Exit'],
    idOf: (element) =>
      element.classList.contains('mapboxgl-ctrl-shrink')
        ? 'FullscreenControl.Exit'
        : 'FullscreenControl.Enter',
  },
  {
    selector: '.mapboxgl-ctrl-geolocate',
    ids: ['GeolocateControl.FindMyLocation', 'GeolocateControl.LocationNotAvailable'],
    idOf: (element) =>
      (element as HTMLButtonElement).disabled
        ? 'GeolocateControl.LocationNotAvailable'
        : 'GeolocateControl.FindMyLocation',
  },
  {
    selector: '.mapboxgl-ctrl-attrib-button',
    ids: ['AttributionControl.ToggleAttribution'],
    idOf: () => 'AttributionControl.ToggleAttribution',
  },
  {
    selector: '.mapbox-improve-map',
    ids: ['AttributionControl.MapFeedback'],
    idOf: () => 'AttributionControl.MapFeedback',
  },
]

/** The mapbox logo, named for screen readers only (it has no title). */
export const MAPBOX_LOGO = { selector: '.mapboxgl-ctrl-logo', id: 'LogoControl.Title' }

/**
 * Switches a mapbox-gl map's own UI strings to `locale` while it is open, e.g. when the user picks
 * another language. mapbox-gl reads its `locale` option only once, when the map is built, and has
 * no API to change it. So the table is replaced on the map, where its controls look up the
 * strings they set later (fullscreen on and off, the geolocation states, the scale's units), and
 * the labels set already — `title` and `aria-label` — are set anew. `map._locale` is internal to
 * mapbox-gl: with `MAPBOX_LABELLED_CONTROLS`, a host app tests this against the version it ships.
 */
export function setMapboxLocale(map: MapboxMap, locale: MapboxLocale): void {
  map._locale = { ...map._locale, ...locale }
  const container = map.getContainer()
  for (const { selector, idOf } of MAPBOX_LABELLED_CONTROLS) {
    container.querySelectorAll(selector).forEach((element) => {
      const text = map._locale[idOf(element)]
      element.setAttribute('title', text)
      element.setAttribute('aria-label', text)
    })
  }
  container.querySelectorAll(MAPBOX_LOGO.selector).forEach((logo) => {
    logo.setAttribute('aria-label', map._locale[MAPBOX_LOGO.id])
  })
}

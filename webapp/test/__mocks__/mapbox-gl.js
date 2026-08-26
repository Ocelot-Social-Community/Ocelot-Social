/**
 * Global Jest mock for `mapbox-gl`.
 *
 * Real `mapbox-gl` requires WebGL/canvas APIs jsdom doesn't provide, so any
 * component that imports it (directly, or transitively through
 * EventLocationMap/ContributionForm) needs this stub to be mountable in
 * tests. Individual spec files (e.g. pages/map.spec.js) may still call
 * `jest.mock('mapbox-gl', factory)` locally for a richer, test-specific
 * fake — that takes precedence over this fallback.
 */
function createMapInstance() {
  return {
    addControl: jest.fn(),
    on: jest.fn(),
    flyTo: jest.fn(),
    setStyle: jest.fn(),
    remove: jest.fn(),
    resize: jest.fn(),
    getContainer: jest.fn(() => document.createElement('div')),
    // OsLocationMap's setPicking()/flyToPin() call these directly.
    getCanvas: jest.fn(() => document.createElement('canvas')),
    getZoom: jest.fn(() => 2),
  }
}

function createMarkerInstance() {
  const marker = {
    setLngLat: jest.fn(function () {
      return marker
    }),
    addTo: jest.fn(function () {
      return marker
    }),
    on: jest.fn(),
    remove: jest.fn(),
    setDraggable: jest.fn(),
    getLngLat: jest.fn(() => ({ lng: 0, lat: 0 })),
    // OsLocationMap's updateMarker() reads this for the view-on-map a11y attrs.
    getElement: jest.fn(() => document.createElement('div')),
  }
  return marker
}

module.exports = {
  accessToken: null,
  Map: jest.fn(createMapInstance),
  Marker: jest.fn(createMarkerInstance),
  NavigationControl: jest.fn(),
  FullscreenControl: jest.fn(),
  GeolocateControl: jest.fn(),
  ScaleControl: jest.fn(),
  Popup: jest.fn(() => ({
    isOpen: jest.fn(() => false),
    remove: jest.fn(),
    setLngLat: jest.fn(function () {
      return this
    }),
    setHTML: jest.fn(function () {
      return this
    }),
    setDOMContent: jest.fn(function () {
      return this
    }),
    addTo: jest.fn(function () {
      return this
    }),
  })),
}

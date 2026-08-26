import OsLocationMap from './OsLocationMap.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

/**
 * `OsLocationMap` never imports `mapbox-gl` itself — the host app injects its
 * own module instance via the `mapboxGl` prop (see the component's JSDoc).
 * These stories use a minimal stub so the docs render without a real Mapbox
 * access token or network access; it does not draw actual map tiles. Wire a
 * real `mapbox-gl` import + token in the host app.
 */
// A real mapbox-gl-js control button: 29×29px (mapbox-gl.css's own
// `.mapboxgl-ctrl-group button` size), grouped in a white rounded box.
// Building this here (rather than loading real mapbox-gl.css, which these
// stories deliberately don't) is what makes NavigationControl/
// FullscreenControl/GeolocateControl/ScaleControl show up as actual square
// buttons instead of nothing — `new props.mapboxGl.NavigationControl()`
// previously returned a bare `{}` with no `onAdd`, so addControl() silently
// skipped it.
function createStubControlGroup(buttons: { label: string; svg: string }[]) {
  return function StubControl(this: unknown) {
    return {
      onAdd: () => {
        const group = document.createElement('div')
        group.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'
        group.style.cssText =
          'background: #fff; border-radius: 4px; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);'
        buttons.forEach(({ label, svg }, i) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.title = label
          button.setAttribute('aria-label', label)
          button.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 29px;
            height: 29px;
            padding: 0;
            border: 0;
            ${i > 0 ? 'border-top: 1px solid #ddd;' : ''}
            background: transparent;
            cursor: pointer;
            color: #333;
          `
          button.innerHTML = svg
          group.appendChild(button)
        })
        return group
      },
      onRemove: () => {},
    }
  }
}

const plusIcon =
  '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
const minusIcon =
  '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
const fullscreenIcon =
  '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 8V4h4M13 4h4v4M17 12v4h-4M7 16H3v-4"/></svg>'
const geolocateIcon =
  '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="3"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3"/></svg>'

// Real mapbox-gl-js ScaleControl: a bordered bar with the current scale as
// text (e.g. "100 m") — not a button, so it doesn't fit createStubControlGroup.
function StubScaleControl(this: unknown) {
  return {
    onAdd: () => {
      const el = document.createElement('div')
      el.className = 'mapboxgl-ctrl mapboxgl-ctrl-scale'
      el.style.cssText =
        'padding: 0 5px; border: 2px solid #333; border-top: none; background: rgba(255, 255, 255, 0.5); font-size: 10px; color: #333;'
      el.textContent = '100 m'
      return el
    },
    onRemove: () => {},
  }
}

function createStubMapboxGl() {
  // Hoisted (not created fresh per call) so a cursor style setPicking() sets
  // on one getCanvas() call is still there on a later call reading it back —
  // same reasoning for the marker element and updateMarker()'s a11y attrs.
  const canvasElement = document.createElement('canvas')
  // A real mapbox-gl-js marker is an SVG pin, positioned and sized by mapbox
  // itself and its own CSS (neither loaded here — only the JS API is
  // stubbed). Painted as a plain colored dot instead, centered in the
  // container, so the stories at least show *something* where the pin
  // would be rather than nothing.
  const markerElement = document.createElement('div')
  markerElement.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: #3fb1ce;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  `

  // Real mapbox-gl-js builds its DOM *inside* the `container` element the
  // component passes to `new Map({ container, ... })`, and addControl()/
  // Marker#addTo() attach into that same element — that's what actually
  // makes controls and the pin visible. Reusing a fresh, detached div
  // instead of `options.container` here (the previous version of this
  // stub) meant every control and the pin were built, but attached to a
  // `<div>` nothing ever inserted into the page — invisible, and the
  // component's own real container stayed an empty grey box.
  function StubMap(this: unknown, options: { container: HTMLElement }) {
    const container = options.container
    // One absolutely positioned box per corner (mapbox-gl.css's
    // `.mapboxgl-ctrl-top-right` etc.), created lazily per corner actually
    // used. `float` + `clear: both` inside each corner reproduces mapbox's
    // own same-corner stacking (each control lands below the previous one
    // in a right-corner, same as the real thing — see the addControl() call
    // sites' own comment in OsLocationMap.vue).
    const corners = new Map<string, HTMLElement>()
    function getCorner(position: string) {
      let el = corners.get(position)
      if (!el) {
        const [v, h] = position.split('-')
        el = document.createElement('div')
        el.style.cssText = `position: absolute; ${v}: 0; ${h}: 0;`
        container.appendChild(el)
        corners.set(position, el)
      }
      return el
    }
    // Tracks each control's own DOM element so removeControl() below can
    // find and remove it — needed for the editable watcher's
    // map.removeControl(locationPickerControl) call (see OsLocationMap.vue)
    // to work in these stories instead of throwing when a host toggles
    // `editable` off after mount.
    interface StubControl {
      onAdd?: () => HTMLElement
      onRemove?: () => void
    }
    const controlElements = new Map<StubControl, HTMLElement>()
    return {
      addControl: (control?: StubControl, position = 'top-right') => {
        if (typeof control?.onAdd !== 'function') {
          return
        }
        const el = control.onAdd()
        const isRight = position.includes('right')
        const isBottom = position.includes('bottom')
        el.style.cssText += `
          clear: both;
          float: ${isRight ? 'right' : 'left'};
          margin: ${isBottom ? '0' : '10px'} ${isRight ? '10px' : '0'} ${isBottom ? '10px' : '0'} ${
            isRight ? '0' : '10px'
          };
        `
        getCorner(position).appendChild(el)
        controlElements.set(control, el)
      },
      removeControl: (control?: StubControl) => {
        if (!control) {
          return
        }
        controlElements.get(control)?.remove()
        controlElements.delete(control)
        control.onRemove?.()
      },
      on: () => {},
      flyTo: () => {},
      setStyle: () => {},
      remove: () => {},
      resize: () => {},
      getContainer: () => container,
      // Read by setPicking() (cursor styling) and flyToPin() (never zooming
      // back out below the current level).
      getCanvas: () => canvasElement,
      getZoom: () => 2,
    }
  }

  const stubMarker = {
    setLngLat: function (this: unknown) {
      return this
    },
    addTo: function (this: unknown, map: { getContainer: () => HTMLElement }) {
      map.getContainer().appendChild(markerElement)
      return this
    },
    on: () => {},
    remove: () => {},
    setDraggable: () => {},
    getLngLat: () => ({ lng: 0, lat: 0 }),
    // Read by updateMarker() to set the view-on-map a11y attributes.
    getElement: () => markerElement,
  }

  return {
    accessToken: '',
    Map: StubMap,
    Marker: function () {
      return stubMarker
    },
    NavigationControl: createStubControlGroup([
      { label: 'Zoom in', svg: plusIcon },
      { label: 'Zoom out', svg: minusIcon },
    ]),
    FullscreenControl: createStubControlGroup([
      { label: 'Toggle fullscreen', svg: fullscreenIcon },
    ]),
    GeolocateControl: createStubControlGroup([{ label: 'Find my location', svg: geolocateIcon }]),
    ScaleControl: StubScaleControl,
  }
}

const meta: Meta<typeof OsLocationMap> = {
  title: 'Ocelot/LocationMap',
  component: OsLocationMap,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (): { template: string } => ({
      template: '<div style="height: 320px"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof OsLocationMap>

export const NoPin: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
  },
}

export const WithPin: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
    lat: 52.520008,
    lng: 13.404954,
  },
}

export const Editable: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
    lat: 52.520008,
    lng: 13.404954,
    editable: true,
  },
}

export const WithSearch: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
    showSearch: true,
    searchPlaceholder: 'Search address…',
    searchAriaLabel: 'Search address',
    searchClearLabel: 'Clear search',
    searchResults: [
      { id: '1', label: 'Berlin, Germany', lat: 52.520008, lng: 13.404954 },
      { id: '2', label: 'Berlin, Connecticut, United States', lat: 41.6237, lng: -72.7846 },
    ],
  },
}

export const ViewOnMap: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
    lat: 52.520008,
    lng: 13.404954,
    viewOnMap: true,
    viewOnMapLabel: 'View on map',
  },
}

export const WithStyleSwitcher: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
    lat: 52.520008,
    lng: 13.404954,
    styleSwitcherLabel: 'Map style',
    styles: [
      { id: 'streets', url: 'mapbox://styles/mapbox/streets-v11', label: 'Streets' },
      { id: 'satellite', url: 'mapbox://styles/mapbox/satellite-streets-v11', label: 'Satellite' },
      { id: 'dark', url: 'mapbox://styles/mapbox/dark-v10', label: 'Dark' },
    ],
  },
}

// Every optional feature at once — not a realistic combination on its own
// (`editable` and `viewOnMap` individually are, see their own stories above),
// but the only story that shows how a *full* top-right stack (pick-location
// tool above zoom/fullscreen/geolocate/style-switcher) actually looks once
// every control is competing for the same corner.
export const KitchenSink: Story = {
  args: {
    mapboxGl: createStubMapboxGl(),
    accessToken: 'stub-token',
    lat: 52.520008,
    lng: 13.404954,
    editable: true,
    pickLocationLabel: 'Pick location on map',
    showSearch: true,
    searchPlaceholder: 'Search address…',
    searchAriaLabel: 'Search address',
    searchClearLabel: 'Clear search',
    searchResults: [
      { id: '1', label: 'Berlin, Germany', lat: 52.520008, lng: 13.404954 },
      { id: '2', label: 'Berlin, Connecticut, United States', lat: 41.6237, lng: -72.7846 },
    ],
    styleSwitcherLabel: 'Map style',
    styles: [
      { id: 'streets', url: 'mapbox://styles/mapbox/streets-v11', label: 'Streets' },
      { id: 'satellite', url: 'mapbox://styles/mapbox/satellite-streets-v11', label: 'Satellite' },
      { id: 'dark', url: 'mapbox://styles/mapbox/dark-v10', label: 'Dark' },
    ],
  },
}

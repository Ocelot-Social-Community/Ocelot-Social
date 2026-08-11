import OsLocationMap from './OsLocationMap.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

/**
 * `OsLocationMap` never imports `mapbox-gl` itself — the host app injects its
 * own module instance via the `mapboxGl` prop (see the component's JSDoc).
 * These stories use a minimal stub so the docs render without a real Mapbox
 * access token or network access; it does not draw actual map tiles. Wire a
 * real `mapbox-gl` import + token in the host app.
 */
function createStubMapboxGl() {
  // Must be a real `function`, not an arrow function — the component
  // constructs controls via `new props.mapboxGl.NavigationControl()` etc.,
  // and arrow functions cannot be used as constructors.
  function stubControl() {
    return {}
  }
  const stubMap = {
    addControl: () => {},
    on: () => {},
    flyTo: () => {},
    setStyle: () => {},
    remove: () => {},
    getContainer: () => document.createElement('div'),
  }
  const stubMarker = {
    setLngLat: function (this: unknown) {
      return this
    },
    addTo: function (this: unknown) {
      return this
    },
    on: () => {},
    remove: () => {},
    setDraggable: () => {},
    getLngLat: () => ({ lng: 0, lat: 0 }),
  }

  return {
    accessToken: '',
    Map: function () {
      return stubMap
    },
    Marker: function () {
      return stubMarker
    },
    NavigationControl: stubControl,
    FullscreenControl: stubControl,
    GeolocateControl: stubControl,
    ScaleControl: stubControl,
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

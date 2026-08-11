import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import OsLocationMap from './OsLocationMap.vue'

function createMockMapboxGl() {
  const mapHandlers: Record<string, (...args: unknown[]) => void> = {}
  const mapInstance = {
    addControl: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      mapHandlers[event] = handler
    }),
    flyTo: vi.fn(),
    setStyle: vi.fn(),
    remove: vi.fn(),
    getContainer: vi.fn(() => document.createElement('div')),
  }

  const markerHandlers: Record<string, (...args: unknown[]) => void> = {}
  const markerInstance = {
    setLngLat: vi.fn(function (this: typeof markerInstance) {
      return this
    }),
    addTo: vi.fn(function (this: typeof markerInstance) {
      return this
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      markerHandlers[event] = handler
    }),
    remove: vi.fn(),
    setDraggable: vi.fn(),
    getLngLat: vi.fn(() => ({ lng: 13.4, lat: 52.5 })),
  }

  const mapboxGl = {
    accessToken: '',
    Map: vi.fn(function () {
      return mapInstance
    }),
    Marker: vi.fn(function () {
      return markerInstance
    }),
    NavigationControl: vi.fn(),
    FullscreenControl: vi.fn(),
    GeolocateControl: vi.fn(),
    ScaleControl: vi.fn(),
  }

  return { mapboxGl, mapInstance, markerInstance, mapHandlers, markerHandlers }
}

describe('osLocationMap', () => {
  let ctx: ReturnType<typeof createMockMapboxGl>

  beforeEach(() => {
    ctx = createMockMapboxGl()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a mapbox-gl map on mount using the injected library', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    expect(ctx.mapboxGl.Map).toHaveBeenCalledTimes(1)
    expect(ctx.mapboxGl.accessToken).toBe('test-token')
  })

  it('adds the standard controls', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    expect(ctx.mapboxGl.NavigationControl).toHaveBeenCalledTimes(1)
    expect(ctx.mapboxGl.FullscreenControl).toHaveBeenCalledTimes(1)
    expect(ctx.mapboxGl.GeolocateControl).toHaveBeenCalledTimes(1)
    expect(ctx.mapboxGl.ScaleControl).toHaveBeenCalledTimes(1)
    expect(ctx.mapInstance.addControl).toHaveBeenCalledTimes(4)
  })

  it('adds a style switcher control when 2+ styles are given', () => {
    mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        styles: [
          { id: 'streets', url: 'mapbox://styles/mapbox/streets-v11', label: 'Streets' },
          { id: 'satellite', url: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
        ],
      },
    })

    expect(ctx.mapInstance.addControl).toHaveBeenCalledTimes(5)
  })

  it('does not render a pin when lat/lng are not set', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    expect(ctx.mapboxGl.Marker).not.toHaveBeenCalled()
  })

  it('renders a pin when lat/lng are set', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', lat: 52.5, lng: 13.4 },
    })

    expect(ctx.mapboxGl.Marker).toHaveBeenCalledTimes(1)
    expect(ctx.markerInstance.setLngLat).toHaveBeenCalledWith([13.4, 52.5])
  })

  it('flies to and (re)places the pin when lat/lng change', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    await wrapper.setProps({ lat: 48.87, lng: 9.63 })

    expect(ctx.mapboxGl.Marker).toHaveBeenCalledTimes(1)
    expect(ctx.mapInstance.flyTo).toHaveBeenCalledWith({ center: [9.63, 48.87], zoom: 14 })
  })

  it('removes the pin when lat/lng are cleared', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', lat: 52.5, lng: 13.4 },
    })

    await wrapper.setProps({ lat: null, lng: null })

    expect(ctx.markerInstance.remove).toHaveBeenCalledTimes(1)
  })

  it('emits pin-change on map click only when editable', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })

    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })

    expect(wrapper.emitted('pin-change')).toEqual([[{ lat: 1, lng: 2 }]])
  })

  it('does not emit pin-change on map click when not editable', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: false },
    })

    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })

    expect(wrapper.emitted('pin-change')).toBeUndefined()
  })

  it('emits pin-change when the marker is dragged', () => {
    const wrapper = mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: true,
        lat: 52.5,
        lng: 13.4,
      },
    })

    ctx.markerHandlers.dragend()

    expect(wrapper.emitted('pin-change')).toEqual([[{ lat: 52.5, lng: 13.4 }]])
  })

  it('removes the map on unmount', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    wrapper.unmount()

    expect(ctx.mapInstance.remove).toHaveBeenCalledTimes(1)
  })

  describe('search', () => {
    it('does not render a search input by default', () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
      })

      expect(wrapper.find('.os-location-map__search-input').exists()).toBe(false)
    })

    it('emits a debounced search-input event while typing', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').setValue('Berlin')

      expect(wrapper.emitted('search-input')).toBeUndefined()

      vi.advanceTimersByTime(400)

      expect(wrapper.emitted('search-input')).toEqual([['Berlin']])

      vi.useRealTimers()
    })

    it('emits search-select when a result is clicked', async () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          showSearch: true,
          searchResults: [{ id: '1', label: 'Berlin, Germany', lat: 52.5, lng: 13.4 }],
        },
      })

      await wrapper.find('.os-location-map__search-input').setValue('Berlin')
      await wrapper.find('.os-location-map__search-result').trigger('click')

      expect(wrapper.emitted('search-select')).toEqual([
        [{ id: '1', label: 'Berlin, Germany', lat: 52.5, lng: 13.4 }],
      ])
    })

    it('clears the search query and emits an empty search-input', async () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').setValue('Berlin')
      await wrapper.find('.os-location-map__search-clear').trigger('click')

      expect(
        (wrapper.find('.os-location-map__search-input').element as HTMLInputElement).value,
      ).toBe('')

      const searchInputEvents = wrapper.emitted('search-input') ?? []

      expect(searchInputEvents[searchInputEvents.length - 1]).toEqual([''])
    })
  })
})

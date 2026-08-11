import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import OsLocationMap from './OsLocationMap.vue'

interface MapboxControl {
  onAdd: () => HTMLElement
  onRemove?: () => void
}

function createMockMapboxGl() {
  const mapHandlers: Record<string, (...args: unknown[]) => void> = {}
  // Real mapbox-gl-js calls a custom control's onAdd() synchronously inside
  // addControl(), which is what actually creates/mounts its DOM (e.g. the
  // pick-location toggle). Replicate that here so tests can find it.
  const controlContainers: HTMLElement[] = []
  // A stable container (mapbox-gl-js reuses the same element across calls)
  // so tests can pre-populate it, e.g. to simulate mapbox-gl's own
  // untyped-button controls (like the attribution "i" toggle).
  const mapContainer = document.createElement('div')
  const mapInstance = {
    addControl: vi.fn((control?: MapboxControl, _position?: string) => {
      if (typeof control?.onAdd === 'function') {
        controlContainers.push(control.onAdd())
      }
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      mapHandlers[event] = handler
    }),
    flyTo: vi.fn(),
    setStyle: vi.fn(),
    remove: vi.fn(),
    getContainer: vi.fn(() => mapContainer),
    getCanvas: vi.fn(() => ({ style: {} }) as HTMLCanvasElement),
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

  return { mapboxGl, mapInstance, markerInstance, mapHandlers, markerHandlers, controlContainers }
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

  function findControlWithOnAdd() {
    return ctx.mapInstance.addControl.mock.calls
      .map(([control]) => control)
      .find((control) => typeof control?.onAdd === 'function')
  }

  function getPickerToggle() {
    const toggle = ctx.controlContainers
      .map((container) => container.querySelector('.os-location-map-picker-toggle'))
      .find((el): el is HTMLButtonElement => el !== null)
    if (!toggle) throw new Error('pick-location toggle was not found')
    return toggle
  }

  it('arms the pick-location tool by default when there is no pin yet', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })

    const toggle = getPickerToggle()
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(true)

    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })
    expect(wrapper.emitted('pin-change')).toEqual([[{ lat: 1, lng: 2 }]])
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)

    // Disarmed again — a further click doesn't emit anything else.
    ctx.mapHandlers.click({ lngLat: { lat: 3, lng: 4 } })
    expect(wrapper.emitted('pin-change')).toEqual([[{ lat: 1, lng: 2 }]])
  })

  it('ignores a bare map click once a pin already exists, until re-armed', () => {
    const wrapper = mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: true,
        lat: 52.5,
        lng: 13.4,
      },
    })

    const toggle = getPickerToggle()
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)

    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })
    expect(wrapper.emitted('pin-change')).toBeUndefined()

    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })
    expect(wrapper.emitted('pin-change')).toEqual([[{ lat: 1, lng: 2 }]])
  })

  it('re-arms the tool automatically once the pin is cleared', async () => {
    const wrapper = mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: true,
        lat: 52.5,
        lng: 13.4,
      },
    })

    const toggle = getPickerToggle()
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)

    await wrapper.setProps({ lat: null, lng: null })

    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(true)
  })

  it('disarms the pick-location tool on a second toggle click without setting the pin', () => {
    const wrapper = mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: true,
        lat: 52.5,
        lng: 13.4,
      },
    })

    const toggle = getPickerToggle()
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)

    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })
    expect(wrapper.emitted('pin-change')).toBeUndefined()
  })

  it('sets type="button" on mapbox-gl\'s own untyped buttons, so they cannot submit a host form', () => {
    const untypedButton = document.createElement('button')
    ctx.mapInstance.getContainer().appendChild(untypedButton)

    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    expect(untypedButton.getAttribute('type')).toBe('button')
  })

  it('does not add the pick-location tool when not editable', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: false },
    })

    expect(findControlWithOnAdd()).toBeUndefined()
  })

  it('places the pick-location tool top-left when search is hidden, top-right otherwise', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })
    const withoutSearchCall = ctx.mapInstance.addControl.mock.calls.find(
      ([control]) => typeof control?.onAdd === 'function',
    )
    expect(withoutSearchCall?.[1]).toBe('top-left')

    ctx = createMockMapboxGl()
    mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: true,
        showSearch: true,
      },
    })
    const withSearchCall = ctx.mapInstance.addControl.mock.calls.find(
      ([control]) => typeof control?.onAdd === 'function',
    )
    expect(withSearchCall?.[1]).toBe('top-right')
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

    describe('searchCollapsible', () => {
      it('starts as an icon-only toggle instead of the full input', () => {
        const wrapper = mount(OsLocationMap, {
          props: {
            mapboxGl: ctx.mapboxGl,
            accessToken: 'test-token',
            showSearch: true,
            searchCollapsible: true,
          },
        })

        expect(wrapper.find('.os-location-map__search-toggle').exists()).toBe(true)
        expect(wrapper.find('.os-location-map__search-input').exists()).toBe(false)
      })

      it('expands to the full input when the toggle is clicked', async () => {
        const wrapper = mount(OsLocationMap, {
          props: {
            mapboxGl: ctx.mapboxGl,
            accessToken: 'test-token',
            showSearch: true,
            searchCollapsible: true,
          },
        })

        await wrapper.find('.os-location-map__search-toggle').trigger('click')

        expect(wrapper.find('.os-location-map__search-toggle').exists()).toBe(false)
        expect(wrapper.find('.os-location-map__search-input').exists()).toBe(true)
      })

      it('collapses again on blur once the input is empty', async () => {
        vi.useFakeTimers()
        const wrapper = mount(OsLocationMap, {
          props: {
            mapboxGl: ctx.mapboxGl,
            accessToken: 'test-token',
            showSearch: true,
            searchCollapsible: true,
          },
        })

        await wrapper.find('.os-location-map__search-toggle').trigger('click')
        await wrapper.find('.os-location-map__search-input').trigger('blur')
        vi.advanceTimersByTime(150)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.os-location-map__search-toggle').exists()).toBe(true)
        vi.useRealTimers()
      })

      it('stays expanded on blur while the input still has text', async () => {
        vi.useFakeTimers()
        const wrapper = mount(OsLocationMap, {
          props: {
            mapboxGl: ctx.mapboxGl,
            accessToken: 'test-token',
            showSearch: true,
            searchCollapsible: true,
          },
        })

        await wrapper.find('.os-location-map__search-toggle').trigger('click')
        await wrapper.find('.os-location-map__search-input').setValue('Berlin')
        await wrapper.find('.os-location-map__search-input').trigger('blur')
        vi.advanceTimersByTime(150)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.os-location-map__search-input').exists()).toBe(true)
        vi.useRealTimers()
      })
    })
  })
})

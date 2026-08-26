/* eslint-disable security/detect-object-injection */
// Event-handler maps below are keyed by mapbox-gl's own fixed event names
// ('click', 'dragend', ...), never by anything attacker-controlled.
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import OsLocationMap from './OsLocationMap.vue'

import type { Mock } from 'vitest'

interface MapboxControl {
  onAdd: () => HTMLElement
  onRemove?: () => void
}

// Named so setLngLat/addTo can return it without referencing the not-yet-
// fully-typed `markerInstance` const from inside its own initializer (which
// TypeScript can only resolve as `any`, cascading into every call site).
// Methods are typed as `Mock<...>` (not plain functions) so call sites can
// use vi.fn()'s own inspection methods (mockClear(), etc.) on them too.
interface MockMarker {
  setLngLat: Mock<(lngLat: [number, number]) => MockMarker>
  addTo: Mock<(map: unknown) => MockMarker>
  on: Mock<(event: string, handler: (...args: unknown[]) => void) => void>
  remove: Mock<() => void>
  setDraggable: Mock<(draggable: boolean) => void>
  getLngLat: Mock<() => { lng: number; lat: number }>
  getElement: Mock<() => HTMLElement>
}

function createMockMapboxGl() {
  const mapHandlers: Record<string, (...args: unknown[]) => void> = {}
  // Real mapbox-gl-js calls a custom control's onAdd() synchronously inside
  // addControl(), which is what actually creates/mounts its DOM (e.g. the
  // pick-location toggle). Replicate that here so tests can find it.
  const controlContainers: HTMLElement[] = []
  // Every custom control added via addControl(), tracked so remove() below
  // can replicate real mapbox-gl-js behaviour on teardown.
  const controls: MapboxControl[] = []
  // A stable container (mapbox-gl-js reuses the same element across calls)
  // so tests can pre-populate it, e.g. to simulate mapbox-gl's own
  // untyped-button controls (like the attribution "i" toggle).
  const mapContainer = document.createElement('div')
  const mapInstance = {
    addControl: vi.fn<(control?: MapboxControl, position?: string) => void>((control) => {
      if (typeof control?.onAdd === 'function') {
        controls.push(control)
        controlContainers.push(control.onAdd())
      }
    }),
    // Real mapbox-gl-js removes a single control's DOM and calls its own
    // onRemove() — used by OsLocationMap to tear down the pick-location tool
    // when `editable` flips back to false after mount.
    removeControl: vi.fn<(control?: MapboxControl) => void>((control) => {
      if (!control) {
        return
      }
      const index = controls.indexOf(control)
      if (index !== -1) {
        controls.splice(index, 1)
        controlContainers.splice(index, 1)[0]?.remove()
      }
      control.onRemove?.()
    }),
    on: vi.fn<(event: string, handler: (...args: unknown[]) => void) => void>((event, handler) => {
      mapHandlers[event] = handler
    }),
    flyTo: vi.fn<(options: { center: [number, number]; zoom: number }) => void>(),
    setStyle: vi.fn<(url: string) => void>(),
    // Real mapbox-gl-js calls control.onRemove() unconditionally for every
    // added control when the map is destroyed — a control missing onRemove
    // throws "onRemove is not a function" there. Replicate that here so a
    // control forgetting to define one fails a test instead of only
    // surfacing live, on navigating away from the page.
    remove: vi.fn<() => void>(() => {
      controls.forEach((control) => {
        ;(control.onRemove as () => void)()
      })
    }),
    getContainer: vi.fn<() => HTMLElement>(() => mapContainer),
    getCanvas: vi.fn<() => HTMLCanvasElement>(() => ({ style: {} }) as HTMLCanvasElement),
    // Below the default pinZoom (14) so existing flyTo assertions (which
    // expect zoom: 14) keep working unchanged — tests exercising the
    // "never zoom back out" behavior override this per-test.
    getZoom: vi.fn<() => number>(() => 2),
  }

  const markerHandlers: Record<string, (...args: unknown[]) => void> = {}
  const markerElement = document.createElement('div')
  const markerInstance: MockMarker = {
    setLngLat: vi.fn<(lngLat: [number, number]) => MockMarker>(function (this: MockMarker) {
      return this
    }),
    addTo: vi.fn<(map: unknown) => MockMarker>(function (this: MockMarker) {
      return this
    }),
    on: vi.fn<(event: string, handler: (...args: unknown[]) => void) => void>((event, handler) => {
      markerHandlers[event] = handler
    }),
    remove: vi.fn<() => void>(),
    setDraggable: vi.fn<(draggable: boolean) => void>(),
    getLngLat: vi.fn<() => { lng: number; lat: number }>(() => ({ lng: 13.4, lat: 52.5 })),
    getElement: vi.fn<() => HTMLElement>(() => markerElement),
  }

  const mapboxGl = {
    accessToken: '',
    Map: vi.fn<() => typeof mapInstance>(function () {
      return mapInstance
    }),
    Marker: vi.fn<(options?: { draggable?: boolean; color?: string }) => MockMarker>(function () {
      return markerInstance
    }),
    NavigationControl: vi.fn<() => void>(),
    FullscreenControl: vi.fn<() => void>(),
    GeolocateControl:
      vi.fn<(options?: { positionOptions?: { enableHighAccuracy?: boolean } }) => void>(),
    ScaleControl: vi.fn<() => void>(),
  }

  return {
    mapboxGl,
    mapInstance,
    markerInstance,
    markerElement,
    mapHandlers,
    markerHandlers,
    controlContainers,
  }
}

describe('osLocationMap', () => {
  let ctx: ReturnType<typeof createMockMapboxGl>

  beforeEach(() => {
    ctx = createMockMapboxGl()
  })

  afterEach(() => {
    // Restores real timers even if a fake-timer test's assertions throw before
    // reaching its own vi.useRealTimers() call, so a failure can't leak faked
    // timers into later tests.
    vi.useRealTimers()
    vi.restoreAllMocks()
    // The style switcher's popover is appended straight to document.body (by
    // design — see buildStyleSwitcher()'s own comment); most tests that open
    // one don't unmount afterwards, so without this every later test would
    // find multiple stale popovers accumulated from earlier ones.
    document.querySelectorAll('.os-location-map-style-popover').forEach((el) => {
      el.remove()
    })
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

  it('passes pinColor through to the mapbox-gl Marker', () => {
    mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        lat: 52.5,
        lng: 13.4,
        pinColor: '#7753eb',
      },
    })

    expect(ctx.mapboxGl.Marker).toHaveBeenCalledWith(expect.objectContaining({ color: '#7753eb' }))
  })

  it('flies to and (re)places the pin when lat/lng change', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    await wrapper.setProps({ lat: 48.87, lng: 9.63 })

    expect(ctx.mapboxGl.Marker).toHaveBeenCalledTimes(1)
    expect(ctx.mapInstance.flyTo).toHaveBeenCalledWith({ center: [9.63, 48.87], zoom: 14 })
  })

  it('does not zoom back out when the pin changes while already zoomed in past pinZoom', async () => {
    ctx.mapInstance.getZoom.mockReturnValue(16)
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    await wrapper.setProps({ lat: 48.87, lng: 9.63 })

    expect(ctx.mapInstance.flyTo).toHaveBeenCalledWith({ center: [9.63, 48.87], zoom: 16 })
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
    if (!toggle) {
      throw new Error('pick-location toggle was not found')
    }
    return toggle
  }

  it('arms the pick-location tool by default when there is no pin yet', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })

    const toggle = getPickerToggle()

    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(true)

    ctx.mapHandlers.click({ lngLat: { lat: 1, lng: 2 } })

    expect(wrapper.emitted('pin-change')).toStrictEqual([[{ lat: 1, lng: 2 }]])
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)

    // Disarmed again — a further click doesn't emit anything else.
    ctx.mapHandlers.click({ lngLat: { lat: 3, lng: 4 } })

    expect(wrapper.emitted('pin-change')).toStrictEqual([[{ lat: 1, lng: 2 }]])
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

    expect(wrapper.emitted('pin-change')).toStrictEqual([[{ lat: 1, lng: 2 }]])
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

  it('places the pick-location tool top-right regardless of whether search is shown', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })
    const withoutSearchCall = ctx.mapInstance.addControl.mock.calls.find(
      ([control]) => typeof control?.onAdd === 'function',
    )

    expect(withoutSearchCall?.[1]).toBe('top-right')

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

    expect(wrapper.emitted('pin-change')).toStrictEqual([[{ lat: 52.5, lng: 13.4 }]])
  })

  it('repositions the existing marker (rather than recreating it) when lat/lng change again', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', lat: 52.5, lng: 13.4 },
    })

    await wrapper.setProps({ lat: 48.87, lng: 9.63 })

    expect(ctx.mapboxGl.Marker).toHaveBeenCalledTimes(1)
    expect(ctx.markerInstance.setLngLat).toHaveBeenLastCalledWith([9.63, 48.87])
  })

  it('updates the existing marker draggable state when editable changes', async () => {
    const wrapper = mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: false,
        lat: 52.5,
        lng: 13.4,
      },
    })
    ctx.markerInstance.setDraggable.mockClear()

    await wrapper.setProps({ editable: true })

    expect(ctx.markerInstance.setDraggable).toHaveBeenCalledWith(true)
  })

  it('does nothing when editable changes and no marker exists yet', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: false },
    })

    await wrapper.setProps({ editable: true })

    expect(ctx.markerInstance.setDraggable).not.toHaveBeenCalled()
  })

  it('adds the pick-location tool when editable flips from false to true after mount', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: false },
    })

    expect(findControlWithOnAdd()).toBeUndefined()

    await wrapper.setProps({ editable: true })

    expect(findControlWithOnAdd()).toBeDefined()
  })

  it('removes the pick-location tool and the Escape listener when editable flips from true to false after mount', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })
    // Captured before removal — getPickerToggle() looks it up via
    // ctx.controlContainers, which removeControl()'s mock splices the
    // container out of once removed.
    const toggle = getPickerToggle()
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener')

    await wrapper.setProps({ editable: false })

    expect(ctx.mapInstance.removeControl).toHaveBeenCalledTimes(1)
    expect(removeListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    // The removed control's own onRemove() is what disarms picking — assert
    // the DOM effect it produces rather than reaching into private state.
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)
  })

  it('does not add a second pick-location control on a false-then-true editable round trip', async () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })
    ctx.mapInstance.addControl.mockClear()

    await wrapper.setProps({ editable: false })
    await wrapper.setProps({ editable: true })

    const pickerAddCalls = ctx.mapInstance.addControl.mock.calls.filter(
      ([control]) => typeof control?.onAdd === 'function',
    )

    expect(pickerAddCalls).toHaveLength(1)
  })

  it('does not throw when the pick-location toggle is clicked after the map is torn down', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })
    const toggle = getPickerToggle()

    wrapper.unmount()

    expect(() => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }).not.toThrow()
  })

  it('disarms the pick-location tool on Escape', () => {
    mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })
    const toggle = getPickerToggle()

    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)
  })

  it('ignores Escape when the tool is not currently armed', () => {
    mount(OsLocationMap, {
      props: {
        mapboxGl: ctx.mapboxGl,
        accessToken: 'test-token',
        editable: true,
        lat: 52.5,
        lng: 13.4,
      },
    })
    // A pin already exists, so the tool starts disarmed.
    const toggle = getPickerToggle()

    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }).not.toThrow()
    expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)
  })

  it('unmounts cleanly with the pick-location tool active (picker control onRemove)', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
    })

    expect(() => {
      wrapper.unmount()
    }).not.toThrow()
  })

  describe('keyboard accessibility', () => {
    it('exposes the pick-location toggle as a real, natively focusable button', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
      })
      const toggle = getPickerToggle()

      expect(toggle.tagName).toBe('BUTTON')
      expect(toggle.getAttribute('type')).toBe('button')
      expect(toggle.hasAttribute('tabindex')).toBe(false)
    })

    it('disarms the pick-location tool on Escape, reachable without a mouse', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', editable: true },
      })
      const toggle = getPickerToggle()

      expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(toggle.classList.contains('os-location-map-picker-toggle--active')).toBe(false)
    })
  })

  describe('viewOnMap', () => {
    it('does not add a view-on-map control or clickable pin by default', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', lat: 52.5, lng: 13.4 },
      })

      const control = ctx.controlContainers
        .map((container) => container.querySelector('.os-location-map-view-on-map-toggle'))
        .find((el) => el !== null)

      expect(control).toBeUndefined()
      expect(ctx.markerElement.style.cursor).not.toBe('pointer')
    })

    it('adds a view-on-map control that emits the current coordinates when clicked', () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          lat: 52.5,
          lng: 13.4,
          viewOnMap: true,
          viewOnMapLabel: 'View on map',
        },
      })

      const button = ctx.controlContainers
        .map((container) => container.querySelector('.os-location-map-view-on-map-toggle'))
        .find((el): el is HTMLButtonElement => el !== null)

      expect(button).toBeDefined()
      expect(button?.getAttribute('aria-label')).toBe('View on map')

      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('view-on-map')).toStrictEqual([[{ lat: 52.5, lng: 13.4 }]])
    })

    it('makes the pin itself clickable and emits view-on-map on click', () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          lat: 52.5,
          lng: 13.4,
          viewOnMap: true,
        },
      })

      expect(ctx.markerElement.style.cursor).toBe('pointer')

      ctx.markerElement.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('view-on-map')).toStrictEqual([[{ lat: 52.5, lng: 13.4 }]])
    })

    it('exposes the pin as a keyboard-focusable button and activates it on Enter', () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          lat: 52.5,
          lng: 13.4,
          viewOnMap: true,
        },
      })

      expect(ctx.markerElement.getAttribute('role')).toBe('button')
      expect(ctx.markerElement.getAttribute('tabindex')).toBe('0')

      ctx.markerElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      expect(wrapper.emitted('view-on-map')).toStrictEqual([[{ lat: 52.5, lng: 13.4 }]])
    })

    it('activates the pin on Space, preventing the page from scrolling', () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          lat: 52.5,
          lng: 13.4,
          viewOnMap: true,
        },
      })

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      ctx.markerElement.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(wrapper.emitted('view-on-map')).toStrictEqual([[{ lat: 52.5, lng: 13.4 }]])
    })

    it('ignores other keys on the pin', () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          lat: 52.5,
          lng: 13.4,
          viewOnMap: true,
        },
      })

      ctx.markerElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))

      expect(wrapper.emitted('view-on-map')).toBeUndefined()
    })

    it('unmounts cleanly (the view-on-map control must define onRemove)', () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          lat: 52.5,
          lng: 13.4,
          viewOnMap: true,
        },
      })

      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })

    it('does nothing when the view-on-map control is clicked without a pin', () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', viewOnMap: true },
      })

      const button = ctx.controlContainers
        .map((container) => container.querySelector('.os-location-map-view-on-map-toggle'))
        .find((el): el is HTMLButtonElement => el !== null)

      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('view-on-map')).toBeUndefined()
    })
  })

  it('removes the map on unmount', () => {
    const wrapper = mount(OsLocationMap, {
      props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
    })

    wrapper.unmount()

    expect(ctx.mapInstance.remove).toHaveBeenCalledTimes(1)
  })

  it('observes the container for resize and disconnects on unmount', () => {
    const observe = vi.fn<(target: Element) => void>()
    const disconnect = vi.fn<() => void>()
    class MockResizeObserver {
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn<() => void>()
    }
    const originalResizeObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = MockResizeObserver

    try {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
      })

      expect(observe).toHaveBeenCalledTimes(1)

      wrapper.unmount()

      expect(disconnect).toHaveBeenCalledTimes(1)
    } finally {
      globalThis.ResizeObserver = originalResizeObserver
    }
  })

  describe('style switcher', () => {
    const styles = [
      { id: 'streets', url: 'mapbox://styles/mapbox/streets-v11', label: 'Streets' },
      { id: 'satellite', url: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' },
    ]

    function getStyleSwitcherToggle() {
      const toggle = ctx.controlContainers
        .map((container) => container.querySelector('.os-location-map-style-switcher-toggle'))
        .find((el): el is HTMLButtonElement => el !== null)
      if (!toggle) {
        throw new Error('style switcher toggle was not found')
      }
      return toggle
    }

    // The top-level afterEach() removes any popover left in document.body
    // after every test, so at most one can exist here.
    function getLatestPopover() {
      const popover = document.querySelector('.os-location-map-style-popover')
      if (!popover) {
        throw new Error('style popover was not found')
      }
      return popover
    }

    function getStyleOption(index: number) {
      // See getLatestPopover() above re: find() vs. indexed/at() access.
      const option = [
        ...getLatestPopover().querySelectorAll('.os-location-map-style-popover-btn'),
      ].find((_el, i) => i === index)
      if (!option) {
        throw new Error(`style option ${String(index)} was not found`)
      }
      return option as HTMLButtonElement
    }

    it('opens and positions the popover when the toggle is clicked', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()

      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(getLatestPopover().classList.contains('os-location-map-style-popover--open')).toBe(
        true,
      )
      expect(toggle.getAttribute('aria-expanded')).toBe('true')
    })

    it('closes again on a second click of the toggle', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()

      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(getLatestPopover().classList.contains('os-location-map-style-popover--open')).toBe(
        false,
      )
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
    })

    it('selects a style, updates the map, and marks the option active', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      const option = getStyleOption(1)

      option.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(ctx.mapInstance.setStyle).toHaveBeenCalledWith(styles[1].url)
      expect(option.classList.contains('os-location-map-style-popover-btn--active')).toBe(true)
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
    })

    it('closes the popover on window scroll (its fixed position would otherwise go stale)', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      window.dispatchEvent(new Event('scroll'))

      expect(getLatestPopover().classList.contains('os-location-map-style-popover--open')).toBe(
        false,
      )
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
    })

    it('closes the popover on window resize', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      window.dispatchEvent(new Event('resize'))

      expect(getLatestPopover().classList.contains('os-location-map-style-popover--open')).toBe(
        false,
      )
    })

    it('does not react to scroll/resize once the popover is already closed', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(() => {
        window.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('resize'))
      }).not.toThrow()
    })

    it('closes the popover when clicking elsewhere on the page', () => {
      mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(getLatestPopover().classList.contains('os-location-map-style-popover--open')).toBe(
        false,
      )
    })

    it('unmounts cleanly (style switcher onRemove tears down its outside-click listener)', () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', styles },
      })
      const toggle = getStyleSwitcherToggle()
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })
  })

  describe('search', () => {
    it('does not render a search input by default', () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token' },
      })

      expect(wrapper.find('.os-location-map__search-input').exists()).toBe(false)
    })

    it('does not show a results list on focus when there are no results yet', async () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').trigger('focus')

      expect(wrapper.find('.os-location-map__search-result').exists()).toBe(false)
    })

    it('emits a debounced search-input event while typing', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').setValue('Berlin')

      expect(wrapper.emitted('search-input')).toBeUndefined()

      vi.advanceTimersByTime(400)

      expect(wrapper.emitted('search-input')).toStrictEqual([['Berlin']])
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
      const result = wrapper.find('.os-location-map__search-result')

      // Real button semantics (keyboard-focusable/activatable), not a
      // clickable <li> — and type="button" specifically, so it can't
      // accidentally submit a host form the way a type-less/submit button
      // inside a <form> would.
      expect(result.element.tagName).toBe('BUTTON')
      expect(result.attributes('type')).toBe('button')

      await result.trigger('click')

      expect(wrapper.emitted('search-select')).toStrictEqual([
        [{ id: '1', label: 'Berlin, Germany', lat: 52.5, lng: 13.4 }],
      ])
    })

    it('clears the previous debounce timer when typing again quickly', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').setValue('Berl')
      await wrapper.find('.os-location-map__search-input').setValue('Berlin')
      vi.advanceTimersByTime(400)

      expect(wrapper.emitted('search-input')).toStrictEqual([['Berlin']])
    })

    it('clears a pending debounce timer on unmount', async () => {
      vi.useFakeTimers()
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').setValue('Berlin')
      wrapper.unmount()
      vi.advanceTimersByTime(400)

      expect(wrapper.emitted('search-input')).toBeUndefined()
    })

    it('does nothing on blur when the search is not collapsible', async () => {
      const wrapper = mount(OsLocationMap, {
        props: { mapboxGl: ctx.mapboxGl, accessToken: 'test-token', showSearch: true },
      })

      await wrapper.find('.os-location-map__search-input').trigger('blur')

      expect(wrapper.find('.os-location-map__search-input').exists()).toBe(true)
    })

    it('shows previously fetched results again when the input regains focus', async () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          showSearch: true,
          searchResults: [{ id: '1', label: 'Berlin, Germany', lat: 52.5, lng: 13.4 }],
        },
      })

      await wrapper.find('.os-location-map__search-input').trigger('focus')

      expect(wrapper.find('.os-location-map__search-result').exists()).toBe(true)
    })

    it('clears the query after selecting a result without having typed anything first', async () => {
      const wrapper = mount(OsLocationMap, {
        props: {
          mapboxGl: ctx.mapboxGl,
          accessToken: 'test-token',
          showSearch: true,
          searchResults: [{ id: '1', label: 'Berlin, Germany', lat: 52.5, lng: 13.4 }],
        },
      })

      // Focus (not typing) reveals the results, so no debounce timer from
      // onSearchInput exists yet when the result — and then clear — is clicked.
      await wrapper.find('.os-location-map__search-input').trigger('focus')
      await wrapper.find('.os-location-map__search-result').trigger('click')
      await wrapper.find('.os-location-map__search-clear').trigger('click')

      expect(
        (wrapper.find('.os-location-map__search-input').element as HTMLInputElement).value,
      ).toBe('')
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

      expect(searchInputEvents[searchInputEvents.length - 1]).toStrictEqual([''])
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
      })
    })
  })
})

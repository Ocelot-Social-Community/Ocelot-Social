<script lang="ts">
  import {
    computed,
    defineComponent,
    getCurrentInstance,
    h,
    isVue2,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
  } from 'vue-demi'

  import { IconClose } from '#src/components/OsIcon'
  import { cn } from '#src/utils'

  import type { PropType } from 'vue-demi'

  export interface OsLocationMapSearchResult {
    id: string
    label: string
    lat: number
    lng: number
  }

  export interface OsLocationMapStyle {
    id: string
    url: string
    label: string
  }

  // Same glyph as the app's own filled map-pin icon (icons/svgs/map-pin-filled.svg)
  // — a solid shape reads better at small sizes than the thin outline
  // map-marker glyph used elsewhere. White outline keeps it visible over
  // both light and dark map styles. Hotspot (10, 30) sits at the pin's tip —
  // the point that actually touches the map — not the image center.
  const PICKER_CURSOR_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="33" viewBox="0 0 20 33">' +
    '<path d="M19.25,10.4a13.0663,13.0663,0,0,1-1.4607,5.2235,41.5281,41.5281,0,0,1-3.2459,5.5483c-1.1829,1.7369-2.3662,3.2784-3.2541,4.3859-.4438.5536-.8135.9984-1.0721,1.3046-.0844.1-.157.1852-.2164.2545-.06-.07-.1325-.1564-.2173-.2578-.2587-.3088-.6284-.7571-1.0723-1.3147-.8879-1.1154-2.0714-2.6664-3.2543-4.41a42.2677,42.2677,0,0,1-3.2463-5.5535A12.978,12.978,0,0,1,.75,10.4,9.4659,9.4659,0,0,1,10,.75,9.4659,9.4659,0,0,1,19.25,10.4Z" fill="black" stroke="white" stroke-width="1.5"/>' +
    '<path d="M13.55,10A3.55,3.55,0,1,1,10,6.45,3.5484,3.5484,0,0,1,13.55,10Z" fill="#fff"/>' +
    '</svg>'
  const PICKER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(PICKER_CURSOR_SVG)}") 10 30, crosshair`

  /**
   * Interactive map preview with a single, optionally movable pin.
   *
   * Does not import `mapbox-gl` itself — the host app injects its own
   * `mapbox-gl` module via the `mapboxGl` prop. This keeps the library free
   * of the dependency (no bundle weight for non-map consumers, no SSR
   * concerns, no token handling). Search and reverse-geocoding are fully
   * controlled: the component only emits the raw query text / coordinates,
   * the host app resolves them (e.g. via its own backend) and feeds results
   * back through props — no network calls happen inside this component.
   *
   * @slot default - none
   */
  export default defineComponent({
    name: 'OsLocationMap',
    inheritAttrs: false,
    props: {
      /** The `mapbox-gl` module/namespace, injected by the host app. */
      mapboxGl: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: Object as PropType<any>,
        required: true,
      },
      /** Mapbox access token. */
      accessToken: {
        type: String,
        required: true,
      },
      /** Pin latitude. `null`/`undefined` renders the map without a pin. */
      lat: {
        type: Number as PropType<number | null>,
        default: null,
      },
      /** Pin longitude. `null`/`undefined` renders the map without a pin. */
      lng: {
        type: Number as PropType<number | null>,
        default: null,
      },
      /** CSS color for the pin (mapbox-gl Marker's own `color` option). */
      pinColor: {
        type: String,
        default: '#3FB1CE',
      },
      /** `[lng, lat]` used while no pin is set. */
      initialCenter: {
        type: Array as unknown as PropType<[number, number]>,
        default: () => [0, 20],
      },
      /** Zoom level while no pin is set. */
      initialZoom: {
        type: Number,
        default: 2,
      },
      /** Zoom level flown to once a pin is set or moved. */
      pinZoom: {
        type: Number,
        default: 14,
      },
      /** Base map style URL. */
      mapStyle: {
        type: String,
        default: 'mapbox://styles/mapbox/streets-v11',
      },
      /** Alternative styles for the style-switcher control. Hidden if fewer than 2 entries. */
      styles: {
        type: Array as PropType<OsLocationMapStyle[]>,
        default: () => [],
      },
      /** Accessible label for the style-switcher toggle (i18n via prop). */
      styleSwitcherLabel: {
        type: String,
        default: 'Map style',
      },
      /** Enables the pick-location tool and dragging the pin to move it. */
      editable: {
        type: Boolean,
        default: false,
      },
      /** Accessible label for the pick-location-on-map toggle (i18n via prop). */
      pickLocationLabel: {
        type: String,
        default: 'Pick location on map',
      },
      /**
       * Adds a control (and makes the pin itself clickable) for jumping to
       * this location elsewhere — e.g. a host app's own full-page map. The
       * component never navigates itself: it only emits `view-on-map` with
       * the current coordinates; the host app decides what "elsewhere" means.
       */
      viewOnMap: {
        type: Boolean,
        default: false,
      },
      /** Accessible label for the view-on-map control and pin (i18n via prop). */
      viewOnMapLabel: {
        type: String,
        default: 'View on map',
      },
      /** Shows the built-in (controlled) search input. */
      showSearch: {
        type: Boolean,
        default: false,
      },
      /** Placeholder text for the search input (i18n via prop). */
      searchPlaceholder: {
        type: String,
        default: '',
      },
      /** Accessible label for the search input (i18n via prop). */
      searchAriaLabel: {
        type: String,
        default: 'Search',
      },
      /** Accessible label for the search-clear button (i18n via prop). */
      searchClearLabel: {
        type: String,
        default: 'Clear',
      },
      /** Results to render below the search input; supplied by the host app. */
      searchResults: {
        type: Array as PropType<OsLocationMapSearchResult[]>,
        default: () => [],
      },
      /** Debounce delay (ms) before `search-input` fires. */
      searchDebounce: {
        type: Number,
        default: 400,
      },
      /**
       * Starts the search as a collapsed icon-only button (like the main
       * map page's mobile search) that expands to the full input on click,
       * and collapses again once it loses focus while empty.
       */
      searchCollapsible: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['pin-change', 'search-input', 'search-select', 'view-on-map'],
    setup(props, { emit, attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      // In Vue 2, global h() needs currentInstance; use $createElement for icon render fns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createElement = isVue2 ? (instance?.proxy as any)?.$createElement : h
      /* v8 ignore stop */

      function eventProps(
        events: Record<string, (...args: unknown[]) => void>,
      ): Record<string, unknown> {
        /* v8 ignore start -- Vue 2 branch */
        if (isVue2) {
          return { on: events }
        }
        /* v8 ignore stop */
        const result: Record<string, unknown> = {}
        for (const [name, fn] of Object.entries(events)) {
          result[`on${name.charAt(0).toUpperCase()}${name.slice(1)}`] = fn
        }
        return result
      }

      const containerRef = ref<HTMLElement | null>(null)
      const searchInputRef = ref<HTMLInputElement | null>(null)
      const searchQuery = ref('')
      const showResults = ref(false)
      const searchExpanded = ref(!props.searchCollapsible)

      function expandSearch() {
        searchExpanded.value = true
        void nextTick(() => searchInputRef.value?.focus())
      }

      function onSearchInputBlur() {
        if (!props.searchCollapsible) {
          return
        }
        // Delayed so a click on a result/clear button (which blurs the
        // input first) still gets to run before the search collapses away.
        setTimeout(() => {
          if (!searchQuery.value) {
            searchExpanded.value = false
            showResults.value = false
          }
        }, 150)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let map: any = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let marker: any = null
      let debounceTimer: ReturnType<typeof setTimeout> | null = null
      let resizeObserver: ResizeObserver | null = null

      const hasPin = computed(() => typeof props.lat === 'number' && typeof props.lng === 'number')

      function updateMarker() {
        /* v8 ignore start -- map is always set synchronously in onMounted
           before any watcher or the resize observer can run; this guard
           can't be reached through the component's public API/lifecycle. */
        if (!map) {
          return
        }
        /* v8 ignore stop */
        if (!hasPin.value) {
          if (marker) {
            marker.remove()
            marker = null
          }
          return
        }
        const lngLat: [number, number] = [props.lng as number, props.lat as number]
        if (!marker) {
          marker = new props.mapboxGl.Marker({ draggable: props.editable, color: props.pinColor })
            .setLngLat(lngLat)
            .addTo(map)
          marker.on('dragend', () => {
            const { lng, lat } = marker.getLngLat()
            emit('pin-change', { lat, lng })
          })
          if (props.viewOnMap) {
            const el = marker.getElement()
            el.style.cursor = 'pointer'
            el.title = props.viewOnMapLabel
            el.setAttribute('aria-label', props.viewOnMapLabel)
            el.setAttribute('role', 'button')
            el.setAttribute('tabindex', '0')
            const triggerViewOnMap = (e: Event) => {
              e.stopPropagation()
              const { lng, lat } = marker.getLngLat()
              emit('view-on-map', { lat, lng })
            }
            el.addEventListener('click', triggerViewOnMap)
            el.addEventListener('keydown', (e: KeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') {
                return
              }
              if (e.key === ' ') {
                e.preventDefault()
              }
              triggerViewOnMap(e)
            })
          }
        } else {
          marker.setLngLat(lngLat)
          marker.setDraggable(props.editable)
        }
      }

      function flyToPin() {
        if (!map || !hasPin.value) {
          return
        }
        // Zooms in to pinZoom the first time a pin appears (starting from the
        // wide initialZoom), but never zooms back OUT again on a later pin
        // change while the user has since zoomed in further themselves.
        const zoom = Math.max(map.getZoom(), props.pinZoom)
        map.flyTo({ center: [props.lng, props.lat], zoom })
      }

      watch(
        () => [props.lat, props.lng],
        () => {
          updateMarker()
          flyToPin()
        },
      )

      watch(
        () => props.editable,
        () => {
          if (marker) {
            marker.setDraggable(props.editable)
          }
        },
      )

      // A plain map click never sets the pin on its own — the pan cursor and
      // the "click to place" cursor look identical, so a bare click-to-place
      // is easy to trigger by accident while just looking around the map.
      // The pick-location tool below must be explicitly armed first; it
      // disarms itself again after the next click (or a second toggle click,
      // or Escape) so the map goes back to plain panning.
      let isPicking = false
      let pickerToggleEl: HTMLButtonElement | null = null

      function setPicking(value: boolean) {
        isPicking = value
        if (map) {
          map.getCanvas().style.cursor = value ? PICKER_CURSOR : ''
        }
        if (pickerToggleEl) {
          pickerToggleEl.classList.toggle('os-location-map-picker-toggle--active', value)
          pickerToggleEl.setAttribute('aria-pressed', String(value))
        }
      }

      function onDocumentKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isPicking) {
          setPicking(false)
        }
      }

      // With no pin yet, there's nothing an accidental click could disturb —
      // arm the tool automatically. As soon as a pin exists (picked here,
      // dragged, or set from outside via search/props), require it to be
      // re-armed explicitly again; and re-arm automatically if the pin is
      // cleared (e.g. the location field is emptied or "online" is toggled).
      watch(hasPin, (has) => {
        if (props.editable) {
          setPicking(!has)
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function onMapClick(e: any) {
        if (!props.editable || !isPicking) {
          return
        }
        emit('pin-change', { lat: e.lngLat.lat, lng: e.lngLat.lng })
        setPicking(false)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function buildLocationPicker(): any {
        return {
          onAdd: () => {
            const container = document.createElement('div')
            container.className = 'mapboxgl-ctrl os-location-map-picker'

            const toggle = document.createElement('button')
            toggle.type = 'button'
            toggle.className = 'os-location-map-picker-toggle'
            toggle.title = props.pickLocationLabel
            toggle.setAttribute('aria-label', props.pickLocationLabel)
            toggle.setAttribute('aria-pressed', 'false')
            // Same filled map-pin glyph as the cursor above — a solid shape
            // reads more clearly at this small toolbar size than the thin
            // outline map-marker glyph used elsewhere in the app. viewBox is
            // cropped tighter than the source icon's own 0 0 20 33 (measured
            // ink bounds: y 0.83–29.77) — the extra ~3 units below the tip
            // were sized for that icon's own drop-shadow ellipse, which this
            // toolbar rendering drops; left uncropped it pushed the visible
            // shape up and shrank it inside the square aspect-fit box.
            toggle.innerHTML =
              '<svg viewBox="0 0 20 30.5" width="16" height="24" aria-hidden="true">' +
              '<path d="M19.25,10.4a13.0663,13.0663,0,0,1-1.4607,5.2235,41.5281,41.5281,0,0,1-3.2459,5.5483c-1.1829,1.7369-2.3662,3.2784-3.2541,4.3859-.4438.5536-.8135.9984-1.0721,1.3046-.0844.1-.157.1852-.2164.2545-.06-.07-.1325-.1564-.2173-.2578-.2587-.3088-.6284-.7571-1.0723-1.3147-.8879-1.1154-2.0714-2.6664-3.2543-4.41a42.2677,42.2677,0,0,1-3.2463-5.5535A12.978,12.978,0,0,1,.75,10.4,9.4659,9.4659,0,0,1,10,.75,9.4659,9.4659,0,0,1,19.25,10.4Z" fill="currentColor"/>' +
              '<path d="M13.55,10A3.55,3.55,0,1,1,10,6.45,3.5484,3.5484,0,0,1,13.55,10Z" fill="#fff"/>' +
              '</svg>'
            toggle.addEventListener('click', (e) => {
              e.stopPropagation()
              setPicking(!isPicking)
            })
            pickerToggleEl = toggle
            container.appendChild(toggle)

            return container
          },
          onRemove: () => {
            setPicking(false)
            pickerToggleEl = null
          },
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function buildViewOnMapControl(): any {
        return {
          onAdd: () => {
            const container = document.createElement('div')
            container.className = 'mapboxgl-ctrl os-location-map-view-on-map'

            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'os-location-map-view-on-map-toggle'
            button.title = props.viewOnMapLabel
            button.setAttribute('aria-label', props.viewOnMapLabel)
            button.innerHTML =
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
              'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
              '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>' +
              '</svg>'
            button.addEventListener('click', (e) => {
              e.stopPropagation()
              if (!hasPin.value) {
                return
              }
              emit('view-on-map', { lat: props.lat, lng: props.lng })
            })
            container.appendChild(button)

            return container
          },
          onRemove: () => {},
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function buildStyleSwitcher(): any {
        // The popover is appended to <body> (not the control tree) and uses
        // position:fixed, computed from the toggle's own rect. The map
        // container intentionally clips its own content (tiles, markers,
        // controls) via mapbox-gl's own overflow:hidden — a dropdown that
        // needs to visually escape those bounds can't live inside it, and
        // mapbox-gl.css's `.mapboxgl-ctrl { transform: translate(0) }` would
        // otherwise turn an ancestor into a new containing block, trapping
        // position:fixed right back inside the clipped area anyway.
        let popoverEl: HTMLElement
        let outsideHandler: (() => void) | null = null
        let scrollResizeHandler: (() => void) | null = null

        function positionPopover(toggle: HTMLElement) {
          const rect = toggle.getBoundingClientRect()
          popoverEl.style.top = `${rect.top}px`
          popoverEl.style.left = `${rect.left - 6}px`
          popoverEl.style.transform = 'translateX(-100%)'
        }

        function removeScrollResizeHandler() {
          if (scrollResizeHandler) {
            window.removeEventListener('scroll', scrollResizeHandler, true)
            window.removeEventListener('resize', scrollResizeHandler)
            scrollResizeHandler = null
          }
        }

        return {
          onAdd: () => {
            const container = document.createElement('div')
            container.className = 'mapboxgl-ctrl os-location-map-style-switcher'

            const toggle = document.createElement('button')
            toggle.type = 'button'
            toggle.className = 'os-location-map-style-switcher-toggle'
            toggle.title = props.styleSwitcherLabel
            toggle.setAttribute('aria-label', props.styleSwitcherLabel)
            toggle.setAttribute('aria-expanded', 'false')
            toggle.innerHTML =
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
              '<path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/>' +
              '</svg>'

            function closePopover() {
              popoverEl.classList.remove('os-location-map-style-popover--open')
              toggle.setAttribute('aria-expanded', 'false')
              removeScrollResizeHandler()
            }

            toggle.addEventListener('click', (e) => {
              e.stopPropagation()
              const isOpen = popoverEl.classList.toggle('os-location-map-style-popover--open')
              toggle.setAttribute('aria-expanded', String(isOpen))
              if (isOpen) {
                positionPopover(toggle)
                // A fixed-position popover derived from the toggle's rect
                // goes stale the moment the page scrolls or the toggle
                // itself moves/resizes with the viewport — closing (rather
                // than repositioning) matches how a native <select> behaves.
                scrollResizeHandler = closePopover
                window.addEventListener('scroll', scrollResizeHandler, true)
                window.addEventListener('resize', scrollResizeHandler)
              } else {
                removeScrollResizeHandler()
              }
            })
            container.appendChild(toggle)

            popoverEl = document.createElement('div')
            popoverEl.className = 'os-location-map-style-popover'
            popoverEl.setAttribute('role', 'listbox')
            popoverEl.setAttribute('aria-label', props.styleSwitcherLabel)

            props.styles.forEach((style) => {
              const btn = document.createElement('button')
              btn.type = 'button'
              btn.title = style.label
              btn.textContent = style.label
              btn.className = 'os-location-map-style-popover-btn'
              btn.setAttribute('role', 'option')
              if (props.mapStyle === style.url) {
                btn.classList.add('os-location-map-style-popover-btn--active')
                btn.setAttribute('aria-selected', 'true')
              }
              btn.addEventListener('click', (e) => {
                e.stopPropagation()
                map.setStyle(style.url)
                popoverEl.querySelectorAll('.os-location-map-style-popover-btn').forEach((b) => {
                  b.classList.remove('os-location-map-style-popover-btn--active')
                  b.setAttribute('aria-selected', 'false')
                })
                btn.classList.add('os-location-map-style-popover-btn--active')
                btn.setAttribute('aria-selected', 'true')
                closePopover()
              })
              popoverEl.appendChild(btn)
            })
            document.body.appendChild(popoverEl)

            // Listens on the whole document (not just the map) since the
            // popover itself now lives outside the map's DOM subtree — a
            // click anywhere else on the page should close it. Clicks on the
            // toggle/option buttons never reach this handler; they call
            // stopPropagation() in their own listeners above.
            outsideHandler = closePopover
            document.addEventListener('click', outsideHandler)

            return container
          },
          onRemove: () => {
            /* v8 ignore start -- outsideHandler is always set by onAdd
               before onRemove can run for the same control instance; this
               guard only matters for a double-onRemove call, which never
               happens through the component's own lifecycle. */
            if (outsideHandler) {
              document.removeEventListener('click', outsideHandler)
              outsideHandler = null
            }
            /* v8 ignore stop */
            removeScrollResizeHandler()
            popoverEl?.remove()
          },
        }
      }

      onMounted(() => {
        /* v8 ignore start -- SSR / non-browser guard */
        if (typeof window === 'undefined' || !containerRef.value) {
          return
        }
        /* v8 ignore stop */

        // Setting the static accessToken on the injected mapbox-gl module is
        // part of the library's own API contract, not app state — required
        // for older mapbox-gl versions where the Map constructor option alone
        // is not honored.

        props.mapboxGl.accessToken = props.accessToken

        map = new props.mapboxGl.Map({
          container: containerRef.value,
          style: props.mapStyle,
          center: hasPin.value ? [props.lng, props.lat] : props.initialCenter,
          zoom: hasPin.value ? props.pinZoom : props.initialZoom,
          accessToken: props.accessToken,
          failIfMajorPerformanceCaveat: false,
        })

        // mapbox-gl stacks same-corner controls in the order they're added
        // (each addControl() appends below the previous one) — the
        // pick-location/view-on-map tool is added first so it lands at the
        // very top of the top-right stack, above the secondary
        // zoom/fullscreen/geolocate/style controls below it.
        if (props.editable) {
          map.addControl(buildLocationPicker(), 'top-right')
          document.addEventListener('keydown', onDocumentKeydown)
          setPicking(!hasPin.value)
        }

        if (props.viewOnMap) {
          // Same corner the pick-location tool would use — the two are not
          // meant to be active at once (editable vs. read-only display).
          map.addControl(buildViewOnMapControl(), 'top-right')
        }

        map.addControl(new props.mapboxGl.NavigationControl(), 'top-right')
        map.addControl(new props.mapboxGl.FullscreenControl(), 'top-right')
        map.addControl(
          new props.mapboxGl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
          'top-right',
        )
        map.addControl(new props.mapboxGl.ScaleControl(), 'bottom-left')

        if (props.styles.length > 1) {
          map.addControl(buildStyleSwitcher(), 'top-right')
        }

        // A <button> with no explicit `type` defaults to type="submit". Inside
        // a host app's <form> (e.g. an event's create/edit form), clicking
        // mapbox-gl's own built-in controls — the attribution "i" toggle in
        // particular — would otherwise submit that form. All of this
        // component's own buttons already set type="button" explicitly.
        map
          .getContainer()
          .querySelectorAll('button:not([type])')
          .forEach((button: Element) => button.setAttribute('type', 'button'))

        map.on('click', onMapClick)
        updateMarker()

        // mapbox-gl measures the container once at construction time and does
        // not notice later layout changes (e.g. a CSS Grid row settling to its
        // final height after mount) — without this, the map can be stuck at a
        // 0-height canvas even though the container is correctly sized moments
        // later. Not available in jsdom/older browsers, hence the guard.
        /* v8 ignore start -- requires a real ResizeObserver (browser-only) */
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            map?.resize()
            // The marker's screen position is computed once, from the
            // transform in effect at the time it was placed. A later
            // resize() doesn't reliably re-trigger that projection, so
            // force it explicitly — otherwise the pin can stay stuck at a
            // position computed from a stale (e.g. 0-height) container size.
            updateMarker()
          })
          resizeObserver.observe(containerRef.value)
        }
        /* v8 ignore stop */
      })

      onBeforeUnmount(() => {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        if (resizeObserver) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
        // Not gated on props.editable — the listener was added based on its
        // value at mount time, which may no longer match here if a host app
        // changed the prop afterwards. removeEventListener() is a harmless
        // no-op if it was never added in the first place.
        document.removeEventListener('keydown', onDocumentKeydown)
        /* v8 ignore start -- map is always set by the time unmount runs
           (onBeforeUnmount only fires once per instance, after onMounted
           has already assigned it); unreachable through the component's
           own lifecycle. */
        if (map) {
          map.remove()
          map = null
        }
        /* v8 ignore stop */
        marker = null
      })

      function onSearchInput(e: Event) {
        const value = (e.target as HTMLInputElement).value
        searchQuery.value = value
        showResults.value = value.length > 0
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(() => emit('search-input', value), props.searchDebounce)
      }

      function selectResult(result: OsLocationMapSearchResult) {
        showResults.value = false
        searchQuery.value = result.label
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        emit('search-select', result)
      }

      function clearSearch() {
        searchQuery.value = ''
        showResults.value = false
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        emit('search-input', '')
      }

      return () => {
        // A callback ref (rather than passing the Ref object directly) is the
        // one binding style that works reliably in both Vue 2.7 and Vue 3 h().
        const children = [
          h('div', {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref: (el: any) => {
              containerRef.value = el
            },
            class: 'os-location-map__container',
          }),
        ]

        if (props.showSearch && props.searchCollapsible && !searchExpanded.value) {
          children.unshift(
            h('button', {
              type: 'button',
              class: 'os-location-map__search-toggle',
              'aria-label': props.searchAriaLabel,
              // Set imperatively via the DOM ref (rather than Vue's innerHTML
              // prop passthrough) since that isn't handled identically by
              // Vue 2's and Vue 3's h() — this is guaranteed version-safe.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ref: (el: any) => {
                if (!el) {
                  return
                }
                el.innerHTML =
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
                  'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
                  '<circle cx="10" cy="10" r="7"/><line x1="20.5" y1="20.5" x2="15.5" y2="15.5"/>' +
                  '</svg>'
              },
              ...eventProps({ click: () => expandSearch() }),
            }),
          )
        } else if (props.showSearch) {
          const resultItems =
            showResults.value && props.searchResults.length
              ? [
                  h(
                    'ul',
                    { class: 'os-location-map__search-results' },
                    props.searchResults.map((result) =>
                      h('li', { key: result.id }, [
                        h(
                          'button',
                          {
                            type: 'button',
                            class: 'os-location-map__search-result',
                            ...eventProps({ click: () => selectResult(result) }),
                          },
                          result.label,
                        ),
                      ]),
                    ),
                  ),
                ]
              : []

          const clearButton = searchQuery.value
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'os-location-map__search-clear',
                  'aria-label': props.searchClearLabel,
                  ...eventProps({ click: () => clearSearch() }),
                },
                [
                  h('span', { class: 'os-location-map__search-clear-icon' }, [
                    IconClose(createElement, isVue2),
                  ]),
                ],
              )
            : null

          children.unshift(
            h('div', { class: 'os-location-map__search' }, [
              h('input', {
                type: 'text',
                class: 'os-location-map__search-input',
                placeholder: props.searchPlaceholder,
                'aria-label': props.searchAriaLabel,
                value: searchQuery.value,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ref: (el: any) => {
                  searchInputRef.value = el
                },
                ...eventProps({
                  input: onSearchInput as (...args: unknown[]) => void,
                  focus: () => {
                    if (props.searchResults.length) {
                      showResults.value = true
                    }
                  },
                  blur: onSearchInputBlur,
                }),
              }),
              clearButton,
              ...resultItems,
            ]),
          )
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          return h(
            'div',
            {
              class: cn('os-location-map', parentClass, parentDynClass),
              attrs,
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>
        return h(
          'div',
          { class: cn('os-location-map', (attrClass as string) || ''), ...restAttrs },
          children,
        )
      }
    },
  })
</script>

<style>
  .os-location-map {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 200px;
    background: #e5e5e5;
    border-radius: 4px;
    /* No overflow:hidden here — it would clip overlaid UI that intentionally
       extends past the map bounds, e.g. the style-switcher popover below. */
  }

  /* Higher specificity than mapbox-gl's own `.mapboxgl-map { position: relative; ... }`
     rule — mapbox-gl adds that class to this exact element, and at equal
     specificity it can win the cascade depending on stylesheet load order,
     breaking the `inset: 0` fill-parent sizing below. mapbox-gl's own
     `overflow: hidden` is intentionally left standing here — it's what
     clips tiles/markers to the map bounds when panning, same as any map. */
  .os-location-map .os-location-map__container {
    position: absolute;
    inset: 0;
  }

  .os-location-map__search {
    position: absolute;
    top: 10px;
    left: 10px;
    right: 46px;
    z-index: 1;
    max-width: 320px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }

  .os-location-map__search-toggle {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 29px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: white;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    color: #333;
  }

  .os-location-map__search-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .os-location-map__search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 34px 8px 10px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
  }

  .os-location-map__search-clear {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .os-location-map__search-clear-icon {
    width: 14px;
    height: 14px;
  }

  .os-location-map__search-results {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    max-height: 220px;
    overflow-y: auto;
    border-top: 1px solid #eee;
  }

  .os-location-map__search-result {
    display: block;
    width: 100%;
    padding: 6px 10px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    text-align: left;
  }

  .os-location-map__search-result:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .os-location-map__search-result:focus-visible {
    outline: 2px solid var(--os-location-map-accent-color, rgb(0, 142, 230));
    outline-offset: -2px;
  }

  .os-location-map-picker {
    background: white;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }

  .os-location-map-picker-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 29px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: #333;
  }

  .os-location-map-picker-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .os-location-map-picker-toggle--active {
    background: rgba(0, 0, 0, 0.1);
    /* Deliberately not --color-primary — that's the app's brand accent
       (green in this app), which reads as a totally different, unrelated
       signal here. This is the shared "map tool" accent blue, its own
       overridable custom property (also used by the view-on-map button
       below). */
    color: var(--os-location-map-accent-color, rgb(0, 142, 230));
  }

  .os-location-map-view-on-map {
    background: white;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }

  .os-location-map-view-on-map-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 29px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    /* Neutral, same as the picker toggle's own resting state — this button
       has no armed/active state of its own (it's a one-shot action, not a
       toggle), so it shouldn't wear the "tool is active" accent color. */
    color: #333;
  }

  .os-location-map-view-on-map-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .os-location-map-style-switcher {
    position: relative;
    background: white;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }

  .os-location-map-style-switcher-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 29px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: #333;
  }

  .os-location-map-style-switcher-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .os-location-map-style-popover {
    display: none;
    /* top/left/transform are set inline in JS from the toggle's own rect. */
    position: fixed;
    background: white;
    border-radius: 4px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
    overflow: hidden;
    z-index: 10000;
  }

  .os-location-map-style-popover--open {
    display: block;
  }

  .os-location-map-style-popover-btn {
    display: block;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    text-align: left;
  }

  .os-location-map-style-popover-btn:not(:last-child) {
    border-bottom: 1px solid #eee;
  }

  .os-location-map-style-popover-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .os-location-map-style-popover-btn--active {
    font-weight: bold;
    background: rgba(0, 0, 0, 0.08);
  }
</style>

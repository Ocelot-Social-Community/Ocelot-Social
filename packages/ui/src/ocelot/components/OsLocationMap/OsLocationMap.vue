<script lang="ts">
  import {
    computed,
    defineComponent,
    getCurrentInstance,
    h,
    isVue2,
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
      /** Enables click/drag on the map to set the pin. */
      editable: {
        type: Boolean,
        default: false,
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
    },
    emits: ['pin-change', 'search-input', 'search-select'],
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
      const searchQuery = ref('')
      const showResults = ref(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let map: any = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let marker: any = null
      let debounceTimer: ReturnType<typeof setTimeout> | null = null
      let resizeObserver: ResizeObserver | null = null

      const hasPin = computed(() => typeof props.lat === 'number' && typeof props.lng === 'number')

      function updateMarker() {
        if (!map) return
        if (!hasPin.value) {
          if (marker) {
            marker.remove()
            marker = null
          }
          return
        }
        const lngLat: [number, number] = [props.lng as number, props.lat as number]
        if (!marker) {
          marker = new props.mapboxGl.Marker({ draggable: props.editable })
            .setLngLat(lngLat)
            .addTo(map)
          marker.on('dragend', () => {
            const { lng, lat } = marker.getLngLat()
            emit('pin-change', { lat, lng })
          })
        } else {
          marker.setLngLat(lngLat)
          marker.setDraggable(props.editable)
        }
      }

      function flyToPin() {
        if (!map || !hasPin.value) return
        map.flyTo({ center: [props.lng, props.lat], zoom: props.pinZoom })
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
          if (marker) marker.setDraggable(props.editable)
        },
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function onMapClick(e: any) {
        if (!props.editable) return
        emit('pin-change', { lat: e.lngLat.lat, lng: e.lngLat.lng })
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

        function positionPopover(toggle: HTMLElement) {
          const rect = toggle.getBoundingClientRect()
          popoverEl.style.top = `${rect.top}px`
          popoverEl.style.left = `${rect.left - 6}px`
          popoverEl.style.transform = 'translateX(-100%)'
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
            toggle.addEventListener('click', (e) => {
              e.stopPropagation()
              const isOpen = popoverEl.classList.toggle('os-location-map-style-popover--open')
              toggle.setAttribute('aria-expanded', String(isOpen))
              if (isOpen) positionPopover(toggle)
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
                popoverEl.classList.remove('os-location-map-style-popover--open')
                toggle.setAttribute('aria-expanded', 'false')
              })
              popoverEl.appendChild(btn)
            })
            document.body.appendChild(popoverEl)

            outsideHandler = () => {
              popoverEl.classList.remove('os-location-map-style-popover--open')
              toggle.setAttribute('aria-expanded', 'false')
            }
            map.getContainer().addEventListener('click', outsideHandler)

            return container
          },
          onRemove: () => {
            if (outsideHandler && map) {
              map.getContainer().removeEventListener('click', outsideHandler)
              outsideHandler = null
            }
            popoverEl?.remove()
          },
        }
      }

      onMounted(() => {
        /* v8 ignore start -- SSR / non-browser guard */
        if (typeof window === 'undefined' || !containerRef.value) return
        /* v8 ignore stop */

        // Setting the static accessToken on the injected mapbox-gl module is
        // part of the library's own API contract, not app state — required
        // for older mapbox-gl versions where the Map constructor option alone
        // is not honored.
        // eslint-disable-next-line vue/no-mutating-props
        props.mapboxGl.accessToken = props.accessToken

        map = new props.mapboxGl.Map({
          container: containerRef.value,
          style: props.mapStyle,
          center: hasPin.value ? [props.lng, props.lat] : props.initialCenter,
          zoom: hasPin.value ? props.pinZoom : props.initialZoom,
          accessToken: props.accessToken,
          failIfMajorPerformanceCaveat: false,
        })

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
        if (debounceTimer) clearTimeout(debounceTimer)
        if (resizeObserver) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
        if (map) {
          map.remove()
          map = null
        }
        marker = null
      })

      function onSearchInput(e: Event) {
        const value = (e.target as HTMLInputElement).value
        searchQuery.value = value
        showResults.value = value.length > 0
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => emit('search-input', value), props.searchDebounce)
      }

      function selectResult(result: OsLocationMapSearchResult) {
        showResults.value = false
        searchQuery.value = result.label
        emit('search-select', result)
      }

      function clearSearch() {
        searchQuery.value = ''
        showResults.value = false
        if (debounceTimer) clearTimeout(debounceTimer)
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

        if (props.showSearch) {
          const resultItems =
            showResults.value && props.searchResults.length
              ? [
                  h(
                    'ul',
                    { class: 'os-location-map__search-results' },
                    props.searchResults.map((result) =>
                      h(
                        'li',
                        {
                          key: result.id,
                          class: 'os-location-map__search-result',
                          ...eventProps({ click: () => selectResult(result) }),
                        },
                        result.label,
                      ),
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
                ...eventProps({
                  input: onSearchInput as (...args: unknown[]) => void,
                  focus: () => {
                    if (props.searchResults.length) showResults.value = true
                  },
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
    padding: 6px 10px;
    cursor: pointer;
    font-size: 14px;
  }

  .os-location-map__search-result:hover {
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

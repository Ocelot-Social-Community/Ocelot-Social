<!-- Example Reference: https://codesandbox.io/s/v-mapbox-with-nuxt-lbrt6?file=/pages/index.vue -->
<template>
  <div class="map-page">
    <client-only v-if="!isEmpty($env.MAPBOX_TOKEN)">
      <mgl-map
        :mapbox-gl="mapboxgl"
        :access-token="mapOptions.accessToken"
        :map-style.sync="mapOptions.style"
        :center="mapOptions.center"
        :zoom="mapOptions.zoom"
        :max-zoom="mapOptions.maxZoom"
        :cross-source-collisions="false"
        :fail-if-major-performance-caveat="false"
        :preserve-drawing-buffer="true"
        :hash="false"
        :min-pitch="0"
        :max-pitch="60"
        @load="onMapLoad"
      >
        <MglFullscreenControl />
        <MglNavigationControl position="top-right" />
        <MglGeolocateControl position="top-right" />
        <MglScaleControl />
        <div class="map-legend" :class="{ 'map-legend--open': legendOpen }">
          <button
            class="map-legend-toggle"
            :aria-expanded="String(legendOpen)"
            aria-controls="map-legend-content"
            @click="legendOpen = !legendOpen"
          >
            {{ $t('map.legend.title') }}
            <span class="map-legend-arrow" aria-hidden="true">{{ legendOpen ? '▼' : '▲' }}</span>
          </button>
          <div
            id="map-legend-content"
            :class="{ 'map-legend-content--hidden': isMobile && !legendOpen }"
            class="map-legend-content"
            role="region"
            :aria-label="$t('map.legend.title')"
          >
            <div
              v-for="type in markers.types"
              :key="type.id"
              class="map-legend-item"
              data-test="marker-type-item"
            >
              <span :style="{ color: type.color }">
                <os-icon
                  :icon="icons.mapPinFilled"
                  size="xl"
                  :aria-label="$t('map.legend.' + type.id)"
                />
              </span>
              {{ $t('map.legend.' + type.id) }}
              <button
                type="button"
                class="map-legend-visibility-toggle"
                :aria-pressed="String(!isMarkerTypeHidden(type.id))"
                :aria-label="
                  $t(isMarkerTypeHidden(type.id) ? 'map.legend.showType' : 'map.legend.hideType', {
                    type: $t('map.legend.' + type.id),
                  })
                "
                :title="
                  $t(isMarkerTypeHidden(type.id) ? 'map.legend.showType' : 'map.legend.hideType', {
                    type: $t('map.legend.' + type.id),
                  })
                "
                @click="toggleMarkerTypeVisibility(type.id)"
              >
                <os-icon
                  :icon="isMarkerTypeHidden(type.id) ? icons.eyeSlash : icons.eye"
                  size="md"
                />
              </button>
              <button
                v-if="type.id === 'event'"
                type="button"
                class="map-legend-past-events-toggle"
                :aria-pressed="String(showPastEvents)"
                :aria-label="
                  $t(showPastEvents ? 'map.legend.hidePastEvents' : 'map.legend.showPastEvents')
                "
                :title="
                  $t(showPastEvents ? 'map.legend.hidePastEvents' : 'map.legend.showPastEvents')
                "
                @click="toggleShowPastEvents"
              >
                <os-icon :icon="showPastEvents ? icons.clockSlash : icons.clock" size="md" />
              </button>
            </div>
          </div>
        </div>
      </mgl-map>
    </client-only>
    <empty v-else icon="alert" :message="$t('map.alertMessage')" />
  </div>
</template>

<!-- eslint-disable vue/no-reserved-component-names -->
<script>
import { isEmpty } from 'lodash'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { mapGetters } from 'vuex'
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { profileUserQuery } from '~/graphql/User'
import { mapQuery } from '~/graphql/MapQuery'
import mobile from '~/mixins/mobile'
import Empty from '~/components/Empty/Empty'

const maxMobileWidth = 639 // on this width and smaller the mapbox 'MapboxGeocoder' search gets bigger

// Same value as --opacity-soft in root-tokens.css, used only if that custom
// property can't be read yet (e.g. before the stylesheet is applied).
const PAST_EVENT_OPACITY_FALLBACK = 0.7

export default {
  name: 'Map',
  mixins: [mobile(maxMobileWidth)],
  components: {
    Empty,
    OsIcon,
  },
  head() {
    return {
      title: this.$t('map.pageTitle'),
    }
  },
  data() {
    mapboxgl.accessToken = this.$env.MAPBOX_TOKEN
    // Read once at page load, deliberately NOT reactive to later route
    // changes (e.g. toggling "show past events" also touches $route.query,
    // and v-mapbox's `center` watcher calls map.setCenter() on ANY new
    // array reference — a reactive computed here would re-snap the map to
    // this point on every unrelated query-param change, fighting the user's
    // own panning/zooming).
    const query = this.$route?.query || {}
    const lat = parseFloat(query.lat)
    const lng = parseFloat(query.lng)
    const initialCoordinates = Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null
    // Deep-linked from a specific event's "view on map" — opens that
    // event's popup once its marker is on the map (see
    // openInitialEventPopup()), same one-time/non-reactive reasoning as
    // initialCoordinates above.
    const initialEventId = typeof query.eventId === 'string' ? query.eventId : null
    return {
      isEmpty,
      mapboxgl,
      legendOpen: false,
      activeStyle: null,
      initialCoordinates,
      initialEventId,
      // ids from markers.types.id that the user hid via the legend's eye
      // toggle. Purely a local display preference (not deep-linked).
      hiddenMarkerTypes: [],
      defaultCenter: [10.452764, 51.165707], // center of Germany: https://www.gpskoordinaten.de/karte/land/DE
      currentUserLocation: null,
      currentUserCoordinates: null,
      users: null,
      groups: null,
      posts: null,
      markers: {
        types: [
          {
            id: 'theUser',
            color: '#f79640',
            icon: {
              id: 'marker-orange',
              mapName: 'mapbox-marker-icon-20px-orange.png',
            },
          },
          {
            id: 'user',
            color: '#33c377',
            icon: {
              id: 'marker-green',
              mapName: 'mapbox-marker-icon-20px-green.png',
            },
          },
          {
            id: 'group',
            color: '#f84d4d',
            icon: {
              id: 'marker-red',
              mapName: 'mapbox-marker-icon-20px-red.png',
            },
          },
          {
            id: 'event',
            color: '#7753eb',
            icon: {
              id: 'marker-purple',
              mapName: 'mapbox-marker-icon-20px-purple.png',
            },
          },
        ],
        isImagesLoaded: false,
        geoJSON: [],
        isGeoJSON: false,
        isSourceAndLayerAdded: false,
        isFlyToCenter: false,
        popup: null,
      },
    }
  },
  created() {
    this.icons = iconRegistry
  },
  async mounted() {
    this.updateMapPosition()
    window.addEventListener('resize', this.updateMapPosition)

    this.currentUserLocation = await this.getUserLocation(this.currentUser.id)
    this.currentUserCoordinates = this.currentUserLocation
      ? this.getCoordinates(this.currentUserLocation)
      : null
    this.addMarkersOnCheckPrepared()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateMapPosition)
    if (this.geocoderCollapseHandler) {
      window.removeEventListener('resize', this.geocoderCollapseHandler)
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    isPreparedForMarkers() {
      return (
        !this.markers.isGeoJSON &&
        this.markers.isImagesLoaded &&
        this.currentUser &&
        this.users &&
        this.groups &&
        this.posts
      )
    },
    // Mapbox's icon-opacity paint property needs a resolved number, not a
    // live var() reference, hence getComputedStyle() instead of just passing
    // "var(--opacity-soft)" straight through — mirrors how EventLocationMap
    // resolves --color-map-marker-event for the pin color.
    pastEventOpacity() {
      if (typeof window === 'undefined') return PAST_EVENT_OPACITY_FALLBACK
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--opacity-soft')
        .trim()
      const parsed = parseFloat(value)
      return Number.isFinite(parsed) ? parsed : PAST_EVENT_OPACITY_FALLBACK
    },
    availableStyles() {
      // https://docs.mapbox.com/api/maps/styles/
      const availableStyles = {
        outdoors: {
          url: 'mapbox://styles/mapbox/outdoors-v12?optimize=true',
        },
        streets: {
          url: 'mapbox://styles/mapbox/streets-v11?optimize=true',
          // use the newest version?
          // url: 'mapbox://styles/mapbox/streets-v12',
        },
        satellite: {
          url: 'mapbox://styles/mapbox/satellite-streets-v11?optimize=true',
        },
        dark: {
          url: 'mapbox://styles/mapbox/dark-v10?optimize=true',
        },
      }
      Object.keys(availableStyles).forEach((key) => {
        availableStyles[key].title = this.$t('map.styles.' + key)
      })
      return availableStyles
    },
    mapOptions() {
      return {
        // accessToken: this.$env.MAPBOX_TOKEN, // is set already above
        style: !this.activeStyle ? this.availableStyles.outdoors.url : this.activeStyle,
        center: this.mapCenter,
        zoom: this.mapZoom,
        maxZoom: 22,
        // projection: 'globe', // the package is probably to old, because of Vue2: https://docs.mapbox.com/mapbox-gl-js/example/globe/
      }
    },
    mapCenter() {
      return this.initialCoordinates || this.currentUserCoordinates || this.defaultCenter
    },
    mapZoom() {
      if (this.initialCoordinates) return 15
      return this.currentUserCoordinates ? 10 : 4
    },
    // Driven by the route (not local data) so toggling it is a real
    // navigation — reliably reactive for the apollo `variables()` watcher,
    // bookmarkable/shareable, and consistent with the deep-link query params
    // above. Auto-enabled when deep-linking from a past event.
    showPastEvents() {
      return this.$route?.query?.showPastEvents === '1'
    },
  },
  watch: {
    isPreparedForMarkers(newValue) {
      if (newValue) {
        this.addMarkersOnCheckPrepared()
      }
    },
    hiddenMarkerTypes() {
      this.applyMarkerTypeFilter()
    },
  },
  methods: {
    isMarkerTypeHidden(typeId) {
      return this.hiddenMarkerTypes.includes(typeId)
    },
    toggleMarkerTypeVisibility(typeId) {
      this.hiddenMarkerTypes = this.isMarkerTypeHidden(typeId)
        ? this.hiddenMarkerTypes.filter((id) => id !== typeId)
        : [...this.hiddenMarkerTypes, typeId]
    },
    // Hides marker types purely via the layer's own filter — hidden
    // features are then simply not "rendered features", so hover/click
    // popups (queryRenderedFeatures) automatically skip them too.
    applyMarkerTypeFilter() {
      if (!this.map || !this.markers.isSourceAndLayerAdded) return
      const visibleTypes = this.markers.types
        .map((type) => type.id)
        .filter((id) => !this.isMarkerTypeHidden(id))
      this.map.setFilter('markers', ['in', ['get', 'type'], ['literal', visibleTypes]])
    },
    toggleShowPastEvents() {
      const query = { ...this.$route.query }
      if (this.showPastEvents) {
        delete query.showPastEvents
      } else {
        query.showPastEvents = '1'
      }
      this.$router.replace({ path: '/map', query })
    },
    addGeocoder() {
      this.geocoder = new MapboxGeocoder({
        accessToken: this.$env.MAPBOX_TOKEN,
        mapboxgl: this.mapboxgl,
        marker: false,
        collapsed: this.geocoderCollapsed,
      })
      this.map.addControl(this.geocoder, 'top-right')
      // Ensure geocoder stays at the top of the control group
      const container = this.geocoder.container
      const parent = container.parentNode
      if (parent && parent.firstChild !== container) {
        parent.insertBefore(container, parent.firstChild)
      }
    },
    updateMapPosition() {
      const navbar = document.getElementById('navbar')
      const footer = document.getElementById('footer')
      const el = this.$el
      if (navbar) {
        el.style.top = navbar.offsetHeight + 'px'
      }
      if (footer && window.getComputedStyle(footer).display !== 'none') {
        el.style.bottom = footer.offsetHeight + 'px'
      } else {
        el.style.bottom = '0px'
      }
    },
    onMapLoad({ map }) {
      this.map = map

      // set the default atmosphere style
      // this.map.setFog({}) // the package is probably to old, because of Vue2: https://docs.mapbox.com/mapbox-gl-js/example/globe/

      this.map.on('style.load', (value) => {
        // Triggered when `setStyle` is called.
        this.markers.isImagesLoaded = false
        this.markers.isSourceAndLayerAdded = false
        // Without this, addMarkersOnCheckPrepared() below would skip rebuilding
        // markers.geoJSON — isPreparedForMarkers requires !isGeoJSON, which
        // stays permanently true after the very first successful build — and
        // re-add the layer with whatever (possibly stale) data it last held.
        this.markers.isGeoJSON = false
        this.loadMarkersIconsAndAddMarkers()
      })

      // add search field for locations
      this.geocoderCollapsed = window.innerWidth <= 810
      this.addGeocoder()
      this.geocoderCollapseHandler = () => {
        const shouldCollapse = window.innerWidth <= 810
        if (shouldCollapse !== this.geocoderCollapsed) {
          this.geocoderCollapsed = shouldCollapse
          this.map.removeControl(this.geocoder)
          this.addGeocoder()
        }
      }
      window.addEventListener('resize', this.geocoderCollapseHandler)

      // add style switcher control
      let closePopoverHandler = null
      const styleSwitcher = {
        onAdd: () => {
          const container = document.createElement('div')
          container.className = 'mapboxgl-ctrl map-style-switcher'

          // Icon button (layers icon as SVG)
          const styleLabel = this.$t('map.styles.title') || 'Map style'
          const toggle = document.createElement('button')
          toggle.type = 'button'
          toggle.className = 'map-style-switcher-toggle'
          toggle.title = styleLabel
          toggle.setAttribute('aria-label', styleLabel)
          toggle.setAttribute('aria-expanded', 'false')
          toggle.innerHTML =
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' +
            '<path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/>' +
            '</svg>'
          toggle.addEventListener('click', (e) => {
            e.stopPropagation()
            const isOpen = popover.classList.toggle('map-style-popover--open')
            toggle.setAttribute('aria-expanded', String(isOpen))
          })
          container.appendChild(toggle)

          // Popover with style options
          const popover = document.createElement('div')
          popover.className = 'map-style-popover'
          popover.setAttribute('role', 'listbox')
          popover.setAttribute('aria-label', styleLabel)

          Object.entries(this.availableStyles).forEach(([key, style]) => {
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.title = style.title
            btn.textContent = style.title
            btn.className = 'map-style-popover-btn'
            btn.setAttribute('role', 'option')
            if (this.mapOptions.style === style.url) {
              btn.classList.add('map-style-popover-btn--active')
              btn.setAttribute('aria-selected', 'true')
            }
            btn.addEventListener('click', (e) => {
              e.stopPropagation()
              this.setStyle(style.url)
              popover.querySelectorAll('.map-style-popover-btn').forEach((b) => {
                b.classList.remove('map-style-popover-btn--active')
                b.setAttribute('aria-selected', 'false')
              })
              btn.classList.add('map-style-popover-btn--active')
              btn.setAttribute('aria-selected', 'true')
              popover.classList.remove('map-style-popover--open')
              toggle.setAttribute('aria-expanded', 'false')
            })
            popover.appendChild(btn)
          })
          container.appendChild(popover)

          // Close popover when clicking elsewhere on the map
          closePopoverHandler = () => {
            popover.classList.remove('map-style-popover--open')
            toggle.setAttribute('aria-expanded', 'false')
          }
          this.map.getContainer().addEventListener('click', closePopoverHandler)

          return container
        },
        onRemove: () => {
          if (closePopoverHandler) {
            this.map.getContainer().removeEventListener('click', closePopoverHandler)
            closePopoverHandler = null
          }
        },
      }
      this.map.addControl(styleSwitcher, 'top-right')

      // create a popup, but don't add it to the map yet
      this.markers.popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '300px',
      })

      // Desktop: show popup on hover
      this.map.on('mouseenter', 'markers', (e) => {
        const features = this.getFeaturesAtPoint(e.point)
        if (features.length > 0) {
          this.showPopup(features, e.lngLat)
        }
      })

      this.map.on('mouseleave', 'markers', () => {
        this.map.getCanvas().style.cursor = ''
      })

      // Mobile: show popup on click/tap
      this.map.on('click', 'markers', (e) => {
        const features = this.getFeaturesAtPoint(e.point)
        if (features.length > 0) {
          this.showPopup(features, e.lngLat)
          e.originalEvent.stopPropagation()
        }
      })

      this.loadMarkersIconsAndAddMarkers()
    },
    // Show popup for given features at coordinates. Also used to open the
    // popup programmatically for a deep-linked event (see
    // openInitialEventPopup()), not just on hover/click.
    showPopup(features, lngLat) {
      if (this.markers.popup.isOpen()) {
        this.markers.popup.remove()
      }

      this.map.getCanvas().style.cursor = 'pointer'

      const coordinates = features[0].geometry.coordinates.slice()

      // Ensure popup appears over the correct copy when map is zoomed out
      while (Math.abs(lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += lngLat.lng > coordinates[0] ? 360 : -360
      }

      // Build popup content safely using DOM nodes (no raw HTML interpolation)
      const container = document.createElement('div')
      container.className = 'map-popup-container'

      const locationName = features[0].properties.locationName
      if (locationName) {
        const header = document.createElement('div')
        header.className = 'map-popup-header'
        header.textContent = locationName
        container.appendChild(header)
      }

      const body = document.createElement('div')
      body.className = 'map-popup-body'

      features.forEach((feature, index) => {
        if (index > 0) {
          body.appendChild(document.createElement('hr'))
        }

        const markerTypeLabel = this.$t(`map.markerTypes.${feature.properties.type}`)
        const encodedId = encodeURIComponent(feature.properties.id)
        const encodedSlug = encodeURIComponent(feature.properties.slug)
        const markerProfile = {
          theUser: {
            linkTitle: '@' + feature.properties.slug,
            link: `/profile/${encodedId}/${encodedSlug}`,
          },
          user: {
            linkTitle: '@' + feature.properties.slug,
            link: `/profile/${encodedId}/${encodedSlug}`,
          },
          group: {
            linkTitle: '&' + feature.properties.slug,
            link: `/groups/${encodedId}/${encodedSlug}`,
          },
          event: {
            linkTitle: feature.properties.slug,
            link: `/post/${encodedId}/${encodedSlug}`,
          },
        }
        const profile = markerProfile[feature.properties.type]

        const item = document.createElement('div')

        const nameRow = document.createElement('div')
        const nameB = document.createElement('b')
        nameB.textContent = feature.properties.name
        const typeI = document.createElement('i')
        typeI.textContent = ` (${markerTypeLabel})`
        nameRow.appendChild(nameB)
        nameRow.appendChild(typeI)
        item.appendChild(nameRow)

        const linkRow = document.createElement('div')
        const link = document.createElement('a')
        link.href = profile.link
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.textContent = profile.linkTitle
        linkRow.appendChild(link)
        item.appendChild(linkRow)

        body.appendChild(item)

        if (feature.properties.description && feature.properties.description.length > 0) {
          const desc = document.createElement('div')
          desc.style.marginTop = '4px'
          desc.textContent = feature.properties.description
          body.appendChild(desc)
        }
      })

      container.appendChild(body)
      this.markers.popup.setLngLat(coordinates).setDOMContent(container).addTo(this.map)
    },
    // Query all features at the clicked/hovered point
    getFeaturesAtPoint(point) {
      return this.map.queryRenderedFeatures(point, { layers: ['markers'] })
    },
    language(map) {
      // example in mapbox-gl-language: https://github.com/mapbox/mapbox-gl-language/blob/master/index.js
      map.getStyle().layers.forEach(function (thisLayer) {
        if (thisLayer.id.indexOf('-label') > 0) {
          // seems to use user language. specific language would be `name_de`, but is not compatible with all maps
          // variant sets all 'text-field' layers to languages of their countries
          map.setLayoutProperty(thisLayer.id, 'text-field', ['get', 'name'])
        }
      })
    },
    setStyle(url) {
      this.map.setStyle(url)
      this.activeStyle = url
    },
    loadMarkersIconsAndAddMarkers() {
      Promise.all(
        this.markers.types.map(
          (marker) =>
            new Promise((resolve, reject) => {
              // our images have to be in the 'static/img/*' folder otherwise they are not reachable via URL
              this.map.loadImage(
                'img/mapbox/marker-icons/' + marker.icon.mapName,
                (error, image) => {
                  if (error) throw error
                  this.map.addImage(marker.icon.id, image)
                  resolve()
                },
              )
            }),
        ),
      ).then(() => {
        this.markers.isImagesLoaded = true
        this.language(this.map)
        this.addMarkersOnCheckPrepared()
      })
    },
    // Pure function of users/groups/posts/currentUser — reused for the
    // initial build and to refresh an already-added source (e.g. after the
    // "show past events" filter changes and new posts arrive).
    buildMarkersGeoJSON() {
      const geoJSON = []
      // add markers for "users"
      this.users.forEach((user) => {
        if (user.id !== this.currentUser.id) {
          geoJSON.push({
            type: 'Feature',
            properties: {
              type: 'user',
              iconName: 'marker-green',
              iconRotate: 0.0,
              id: user.id,
              slug: user.slug,
              name: user.name,
              locationName: user.location.name,
              description: user.about ? user.about : undefined,
            },
            geometry: {
              type: 'Point',
              coordinates: this.getCoordinates(user.location),
            },
          })
        }
      })
      // add marker for "currentUser"
      if (this.currentUserCoordinates) {
        geoJSON.push({
          type: 'Feature',
          properties: {
            type: 'theUser',
            iconName: 'marker-orange',
            iconRotate: 45.0,
            id: this.currentUser.id,
            slug: this.currentUser.slug,
            name: this.currentUser.name,
            locationName: this.currentUserLocation.name,
            description: this.currentUser.about ? this.currentUser.about : undefined,
          },
          geometry: {
            type: 'Point',
            coordinates: this.currentUserCoordinates,
          },
        })
      }
      // add markers for "groups"
      this.groups.forEach((group) => {
        geoJSON.push({
          type: 'Feature',
          properties: {
            type: 'group',
            iconName: 'marker-red',
            iconRotate: 0.0,
            id: group.id,
            slug: group.slug,
            name: group.name,
            locationName: group.location.name,
            description: group.about ? group.about : undefined,
          },
          geometry: {
            type: 'Point',
            coordinates: this.getCoordinates(group.location),
          },
        })
      })
      // add markers for "posts", post type "Event" with location coordinates
      this.posts.forEach((post) => {
        if (!post.eventLocation) return
        geoJSON.push({
          type: 'Feature',
          properties: {
            type: 'event',
            iconName: 'marker-purple',
            iconRotate: 0.0,
            id: post.id,
            slug: post.slug,
            name: post.title,
            locationName: post.eventLocation.name,
            description: this.$filters.removeHtml(post.content),
            // Mirrors the backend's own "past" definition (filterEventDates in
            // posts.ts): an event still counts as current while EITHER its
            // start or its end is in the future — i.e. it's only "past" once
            // both have elapsed. A still-running event must not render pale.
            isPast: this.isEventPast(post),
          },
          geometry: {
            type: 'Point',
            coordinates: this.getCoordinates(post.eventLocation),
          },
        })
      })

      // Nudge markers of different types sharing the same coordinates
      const coordGroups = {}
      geoJSON.forEach((feature) => {
        const key = feature.geometry.coordinates.join(',')
        if (!coordGroups[key]) coordGroups[key] = []
        coordGroups[key].push(feature)
      })
      const lngOffset = 0.0002 // small longitude offset (~15m at mid-latitudes)
      Object.values(coordGroups).forEach((group) => {
        // Deduplicate by type — only offset distinct types
        const uniqueTypes = [...new Set(group.map((f) => f.properties.type))]
        if (uniqueTypes.length <= 1) return
        const totalWidth = (uniqueTypes.length - 1) * lngOffset
        uniqueTypes.forEach((type, index) => {
          const offset = -totalWidth / 2 + index * lngOffset
          group
            .filter((f) => f.properties.type === type)
            .forEach((feature) => {
              feature.geometry.coordinates = [
                feature.geometry.coordinates[0] + offset,
                feature.geometry.coordinates[1],
              ]
            })
        })
      })

      return geoJSON
    },
    addMarkersOnCheckPrepared() {
      if (this.isPreparedForMarkers) {
        this.markers.geoJSON = this.buildMarkersGeoJSON()
        this.markers.isGeoJSON = true
      }

      // add source and layer
      if (!this.markers.isSourceAndLayerAdded && this.markers.isGeoJSON && this.map) {
        this.map.addSource('markers', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: this.markers.geoJSON,
          },
        })
        this.map.addLayer({
          id: 'markers',
          type: 'symbol',
          source: 'markers',
          layout: {
            'icon-image': ['get', 'iconName'], // get the "icon-image" from the source's "iconName" property
            'icon-allow-overlap': true,
            'icon-size': 1.0,
            'icon-rotate': ['get', 'iconRotate'], // get the "icon-rotate" from the source's "iconRotate" property
            // 'text-field': ['get', 'name'], // get the "text-field" from the source's "name" property
            // 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            // 'text-offset': [0, 0],
            // 'text-anchor': 'top',
            // 'text-allow-overlap': true,
          },
          paint: {
            // Past events (only fetched at all when "show past events" is
            // on) render paler than everything else.
            'icon-opacity': [
              'case',
              ['boolean', ['get', 'isPast'], false],
              this.pastEventOpacity,
              1,
            ],
          },
        })

        this.markers.isSourceAndLayerAdded = true
        // Re-applies any already-toggled hidden types — needed after a style
        // switch too, since that re-adds the layer without a filter.
        this.applyMarkerTypeFilter()
      }

      // fly to center if never done
      if (!this.markers.isFlyToCenter && this.markers.isSourceAndLayerAdded) {
        this.mapFlyToCenter()
        this.markers.isFlyToCenter = true
        this.openInitialEventPopup()
      }
    },
    // Opens the popup for the event a "view on map" deep-link pointed at, so
    // arriving here immediately shows the same event info instead of just an
    // unlabeled pin among possibly many others. The popup positions itself
    // from its own lngLat, so it doesn't need to wait for the flyTo above to
    // finish animating.
    openInitialEventPopup() {
      if (!this.initialEventId) return
      const feature = this.markers.geoJSON.find(
        (f) => f.properties.type === 'event' && f.properties.id === this.initialEventId,
      )
      // Left set (not cleared) when the feature isn't found yet — the
      // deep-linked event may still be missing from an early cache response
      // and only arrive with a later network one, which retries this via
      // refreshMarkersData() below.
      if (!feature) return
      const [lng, lat] = feature.geometry.coordinates
      this.showPopup([feature], { lng, lat })
      this.initialEventId = null
    },
    // Called when users/groups/posts change after the initial load (e.g. the
    // "show past events" filter re-triggered the apollo query, or a cache
    // response was followed by a network one) — updates the already-added
    // source in place instead of re-adding it.
    refreshMarkersData() {
      this.markers.geoJSON = this.buildMarkersGeoJSON()
      this.map.getSource('markers').setData({
        type: 'FeatureCollection',
        features: this.markers.geoJSON,
      })
      this.openInitialEventPopup()
    },
    mapFlyToCenter() {
      if (this.map) {
        // example: https://docs.mapbox.com/mapbox-gl-js/example/center-on-feature/
        this.map.flyTo({
          center: this.mapCenter,
          zoom: this.mapZoom,
        })
      }
    },
    getCoordinates(location) {
      return [location.lng, location.lat]
    },
    // Mirrors filterEventDates() in backend/src/graphql/resolvers/posts.ts:
    // an event stays "current" through the rest of the calendar day it ends
    // on (or, without an eventEnd, the day it started), only truly "past"
    // once that whole day has elapsed — not the instant the raw timestamp
    // passes.
    isEventPast(post) {
      if (!post.eventStart) return false
      const now = new Date()
      const endOfRelevantDate = new Date(post.eventEnd || post.eventStart)
      endOfRelevantDate.setHours(23, 59, 59, 999)
      return endOfRelevantDate < now
    },
    async getUserLocation(id) {
      try {
        const {
          data: { User: users },
        } = await this.$apollo.query({
          query: profileUserQuery(this.$i18n),
          variables: {
            id,
            followedByCount: 0,
            followingCount: 0,
          },
        })
        return users && users[0] && users[0].location ? users[0].location : null
      } catch (err) {
        this.$toast.error(err.message)
        return null
      }
    },
  },
  apollo: {
    mapData: {
      query() {
        return mapQuery(this.$i18n)
      },
      variables() {
        return {
          userFilter: { hasLocation: true },
          groupHasLocation: true,
          postFilter: {
            postType_in: ['Event'],
            ...(this.showPastEvents ? {} : { eventStart_gte: new Date() }),
            hasLocation: true,
            skipPinnedFilter: true,
          },
        }
      },
      update({ User, Group, Post }) {
        this.users = User
        this.groups = Group
        this.posts = Post
        if (this.markers.isSourceAndLayerAdded) {
          this.refreshMarkersData()
        } else {
          this.addMarkersOnCheckPrepared()
        }
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>
<!-- eslint-enable vue/no-reserved-component-names -->

<style>
/*  description: https: //github.com/geospoc/v-mapbox/tree/v1.11.2/docs */
/*    code example: https: //codesandbox.io/embed/v-mapbox-map-demo-k1l1n?autoresize=1&fontsize=14&hidenavigation=1&theme=dark */
@import 'mapbox-gl/dist/mapbox-gl.css';
@import 'v-mapbox/dist/v-mapbox.css';

.map-page {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
  font-family: var(--font-family-text);
  font-size: var(--font-size-base);
}

.mgl-map-wrapper {
  flex: 1;
  min-height: 0;
}

.mgl-map-wrapper {
  overflow: hidden;
}

.mapboxgl-ctrl-attrib.mapboxgl-compact {
  display: flex;
  align-items: center;
  min-height: 24px;
  padding: 0;
}

.mapboxgl-ctrl-attrib-button {
  position: static;
}

.mapboxgl-popup-content {
  max-height: 40vh;
  overflow: hidden;
  padding: 10px;
  border-radius: var(--border-radius-x-large);
}

.map-popup-container {
  display: flex;
  flex-direction: column;
  max-height: calc(40vh - 20px);
  overflow: hidden;
}

.mapboxgl-popup-close-button {
  font-size: var(--font-size-large);
  padding: 2px 6px;
  z-index: 1;
}

.map-popup-header {
  font-weight: bold;
  font-size: var(--font-size-large);
  margin-bottom: 4px;
  padding-right: 16px;
  flex-shrink: 0;
}

.map-popup-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/*  Smaller geocoder on mobile (expanded) */
@media (--vp-mobile) {
  .mapboxgl-ctrl-geocoder {
    font-size: 13px;
    line-height: 18px;
    min-width: 180px;
    max-width: 240px;
  }

  .mapboxgl-ctrl-geocoder--input {
    height: 29px;
    padding: 4px 28px;
  }

  .mapboxgl-ctrl-geocoder--icon-search {
    width: 15px;
    height: 15px;
    top: 7px;
    left: 7px;
  }

  .mapboxgl-ctrl-geocoder--button {
    width: 22px;
    height: 22px;
    top: 4px;
    right: 4px;
  }

  .mapboxgl-ctrl-geocoder--icon-close {
    width: 14px;
    height: 14px;
  }

  .mapboxgl-ctrl-geocoder.mapboxgl-ctrl-geocoder--collapsed {
    width: 29px;
    height: 29px;
    min-width: 29px;
    background-color: var(--color-neutral-100);
    border-radius: var(--border-radius-x-large);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .mapboxgl-ctrl-geocoder--icon-search {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 17px;
      height: 17px;
    }

    .mapboxgl-ctrl-geocoder--input {
      display: none;
    }

    .mapboxgl-ctrl-geocoder--pin-right > * {
      display: none;
    }
  }
}

.map-legend {
  position: absolute;
  bottom: 30px;
  left: 10px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(4px);
  border-radius: var(--border-radius-x-large);
  z-index: 1;
  font-size: var(--font-size-base);
  color: var(--color-neutral-10);
}

.map-legend-toggle {
  display: none;
  width: 100%;
  padding: 4px 8px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-neutral-10);
  border-radius: var(--border-radius-x-large);
  cursor: pointer;
  font-size: var(--font-size-base);
  text-align: left;
  order: 1;
  align-items: center;
  justify-content: space-between;

  &:hover,
  &:active {
    background: rgba(0, 0, 0, 0.1);
  }
}

.map-legend-arrow {
  font-size: var(--font-size-small);
  line-height: 1;
}

.map-legend-content {
  padding: 4px 8px 2px;
}

.map-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.map-legend-visibility-toggle,
.map-legend-past-events-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
  padding: 2px;
  border: none;
  border-radius: var(--border-radius-base, 4px);
  background: none;
  color: inherit;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

@media (max-width: 639px) {
  .map-legend {
    display: flex;
    flex-direction: column;
  }

  .map-legend-toggle {
    display: flex;
  }

  .map-legend-content {
    order: 0;
  }

  .map-legend-content--hidden {
    visibility: hidden;
    height: 0;
    padding: 0 8px;
    overflow: hidden;
  }

  .map-legend--open .map-legend-content {
    border-bottom: 1px solid #eee;
  }

  .map-legend--open .map-legend-toggle {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
}

.map-style-switcher {
  position: relative;
  background: var(--color-neutral-100);
  border-radius: var(--border-radius-x-large);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.map-style-switcher-toggle {
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

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.map-style-popover {
  display: none;
  position: absolute;
  top: 0;
  right: 100%;
  margin-right: 6px;
  background: var(--color-neutral-100);
  border-radius: var(--border-radius-x-large);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;
}

.map-style-popover--open {
  display: block;
}

.map-style-popover-btn {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--font-size-base);
  text-align: left;

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.map-style-popover-btn--active {
  font-weight: bold;
  background: rgba(0, 0, 0, 0.08);
}
</style>

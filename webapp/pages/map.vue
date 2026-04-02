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
          <button class="map-legend-toggle" @click="legendOpen = !legendOpen">
            {{ $t('map.legend.title') }}
            <span class="map-legend-arrow">{{ legendOpen ? '▼' : '▲' }}</span>
          </button>
          <div v-show="legendOpen || !isMobile" class="map-legend-content">
            <div v-for="type in markers.types" :key="type.id" class="map-legend-item">
              <img
                :alt="$t('map.legend.' + type.id)"
                :src="'/img/mapbox/marker-icons/' + type.icon.legendName"
                width="15"
              />
              {{ $t('map.legend.' + type.id) }}
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
import { profileUserQuery } from '~/graphql/User'
import { mapQuery } from '~/graphql/MapQuery'
import mobile from '~/mixins/mobile'
import Empty from '~/components/Empty/Empty'

const maxMobileWidth = 639 // on this width and smaller the mapbox 'MapboxGeocoder' search gets bigger

export default {
  name: 'Map',
  mixins: [mobile(maxMobileWidth)],
  components: {
    Empty,
  },
  head() {
    return {
      title: this.$t('map.pageTitle'),
    }
  },
  data() {
    mapboxgl.accessToken = this.$env.MAPBOX_TOKEN
    return {
      isEmpty,
      mapboxgl,
      legendOpen: false,
      activeStyle: null,
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
            icon: {
              id: 'marker-orange',
              legendName: 'mapbox-marker-icon-orange.svg',
              mapName: 'mapbox-marker-icon-20px-orange.png',
            },
          },
          {
            id: 'user',
            icon: {
              id: 'marker-green',
              legendName: 'mapbox-marker-icon-green.svg',
              mapName: 'mapbox-marker-icon-20px-green.png',
            },
          },
          {
            id: 'group',
            icon: {
              id: 'marker-red',
              legendName: 'mapbox-marker-icon-red.svg',
              mapName: 'mapbox-marker-icon-20px-red.png',
            },
          },
          {
            id: 'event',
            icon: {
              id: 'marker-purple',
              legendName: 'mapbox-marker-icon-purple.svg',
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
        popupOnLeaveTimeoutId: null,
      },
    }
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
      Object.keys(availableStyles).map((key) => {
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
      return this.currentUserCoordinates ? this.currentUserCoordinates : this.defaultCenter
    },
    mapZoom() {
      return this.currentUserCoordinates ? 10 : 4
    },
  },
  watch: {
    isPreparedForMarkers(newValue) {
      if (newValue) {
        this.addMarkersOnCheckPrepared()
      }
    },
  },
  methods: {
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
        this.loadMarkersIconsAndAddMarkers()
      })

      // add search field for locations
      this.map.addControl(
        new MapboxGeocoder({
          accessToken: this.$env.MAPBOX_TOKEN,
          mapboxgl: this.mapboxgl,
          marker: false,
          collapsed: window.innerWidth <= 810,
        }),
        'top-right',
      )

      // add style switcher control
      const styleSwitcher = {
        onAdd: () => {
          const container = document.createElement('div')
          container.className = 'mapboxgl-ctrl map-style-switcher'

          // Icon button (layers icon as SVG)
          const toggle = document.createElement('button')
          toggle.type = 'button'
          toggle.className = 'map-style-switcher-toggle'
          toggle.title = this.$t('map.styles.title') || 'Map style'
          toggle.innerHTML =
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">' +
            '<path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/>' +
            '</svg>'
          toggle.addEventListener('click', (e) => {
            e.stopPropagation()
            popover.classList.toggle('map-style-popover--open')
          })
          container.appendChild(toggle)

          // Popover with style options
          const popover = document.createElement('div')
          popover.className = 'map-style-popover'

          Object.entries(this.availableStyles).forEach(([key, style]) => {
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.title = style.title
            btn.textContent = style.title
            btn.className = 'map-style-popover-btn'
            if (this.mapOptions.style === style.url) {
              btn.classList.add('map-style-popover-btn--active')
            }
            btn.addEventListener('click', (e) => {
              e.stopPropagation()
              this.setStyle(style.url)
              popover.querySelectorAll('.map-style-popover-btn').forEach((b) => {
                b.classList.remove('map-style-popover-btn--active')
              })
              btn.classList.add('map-style-popover-btn--active')
              popover.classList.remove('map-style-popover--open')
            })
            popover.appendChild(btn)
          })
          container.appendChild(popover)

          // Close popover when clicking elsewhere on the map
          this.map.getContainer().addEventListener('click', () => {
            popover.classList.remove('map-style-popover--open')
          })

          return container
        },
        onRemove: () => {},
      }
      this.map.addControl(styleSwitcher, 'top-right')

      // create a popup, but don't add it to the map yet
      this.markers.popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
      })

      // show popup for given features at coordinates
      const showPopup = (features, lngLat) => {
        if (this.popupOnLeaveTimeoutId) {
          clearTimeout(this.popupOnLeaveTimeoutId)
          this.popupOnLeaveTimeoutId = null
        }
        if (this.markers.popup.isOpen()) {
          this.markers.popup.remove()
        }

        this.map.getCanvas().style.cursor = 'pointer'

        const coordinates = features[0].geometry.coordinates.slice()

        // Ensure popup appears over the correct copy when map is zoomed out
        while (Math.abs(lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += lngLat.lng > coordinates[0] ? 360 : -360
        }

        // Build description for all features at this location
        const description = features
          .map((feature) => {
            const markerTypeLabel = this.$t(`map.markerTypes.${feature.properties.type}`)
            const markerProfile = {
              theUser: {
                linkTitle: '@' + feature.properties.slug,
                link: `/profile/${feature.properties.id}/${feature.properties.slug}`,
              },
              user: {
                linkTitle: '@' + feature.properties.slug,
                link: `/profile/${feature.properties.id}/${feature.properties.slug}`,
              },
              group: {
                linkTitle: '&' + feature.properties.slug,
                link: `/groups/${feature.properties.id}/${feature.properties.slug}`,
              },
              event: {
                linkTitle: feature.properties.slug,
                link: `/post/${feature.properties.id}/${feature.properties.slug}`,
              },
            }
            const markerProfileLinkTitle = markerProfile[feature.properties.type].linkTitle
            const markerProfileLink = markerProfile[feature.properties.type].link
            let html = `
              <div>
                <div>
                  <b>${feature.properties.name}</b> <i>(${markerTypeLabel})</i>
                </div>
                <div>
                  <a href="${markerProfileLink}" target="_blank">${markerProfileLinkTitle}</a>
                </div>
              </div>`
            if (feature.properties.description && feature.properties.description.length > 0) {
              html += `
              <div style="margin-top: 4px;">
                ${feature.properties.description}
              </div>`
            }
            return html
          })
          .join('<hr>')

        this.markers.popup.setLngLat(coordinates).setHTML(description).addTo(this.map)
      }

      // Query all features at the clicked/hovered point
      const getFeaturesAtPoint = (point) => {
        return this.map.queryRenderedFeatures(point, { layers: ['markers'] })
      }

      // Desktop: show popup on hover
      this.map.on('mouseenter', 'markers', (e) => {
        const features = getFeaturesAtPoint(e.point)
        if (features.length > 0) {
          showPopup(features, e.lngLat)
        }
      })

      this.map.on('mouseleave', 'markers', () => {
        if (this.markers.popup.isOpen()) {
          this.popupOnLeaveTimeoutId = setTimeout(() => {
            this.map.getCanvas().style.cursor = ''
            this.markers.popup.remove()
          }, 3000)
        }
      })

      // Mobile: show popup on click/tap
      this.map.on('click', 'markers', (e) => {
        const features = getFeaturesAtPoint(e.point)
        if (features.length > 0) {
          showPopup(features, e.lngLat)
          e.originalEvent.stopPropagation()
        }
      })

      this.loadMarkersIconsAndAddMarkers()
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
    addMarkersOnCheckPrepared() {
      // set geoJSON for markers
      if (this.isPreparedForMarkers) {
        // add markers for "users"
        this.users.forEach((user) => {
          if (user.id !== this.currentUser.id) {
            this.markers.geoJSON.push({
              type: 'Feature',
              properties: {
                type: 'user',
                iconName: 'marker-green',
                iconRotate: 0.0,
                id: user.id,
                slug: user.slug,
                name: user.name,
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
          this.markers.geoJSON.push({
            type: 'Feature',
            properties: {
              type: 'theUser',
              iconName: 'marker-orange',
              iconRotate: 45.0,
              id: this.currentUser.id,
              slug: this.currentUser.slug,
              name: this.currentUser.name,
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
          this.markers.geoJSON.push({
            type: 'Feature',
            properties: {
              type: 'group',
              iconName: 'marker-red',
              iconRotate: 0.0,
              id: group.id,
              slug: group.slug,
              name: group.name,
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
          this.markers.geoJSON.push({
            type: 'Feature',
            properties: {
              type: 'event',
              iconName: 'marker-purple',
              iconRotate: 0.0,
              id: post.id,
              slug: post.slug,
              name: post.title,
              description: this.$filters.removeHtml(post.content),
            },
            geometry: {
              type: 'Point',
              coordinates: this.getCoordinates(post.eventLocation),
            },
          })
        })

        // Nudge markers of different types sharing the same coordinates
        const coordGroups = {}
        this.markers.geoJSON.forEach((feature) => {
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
        })

        this.markers.isSourceAndLayerAdded = true
      }

      // fly to center if never done
      if (!this.markers.isFlyToCenter && this.markers.isSourceAndLayerAdded) {
        this.mapFlyToCenter()
        this.markers.isFlyToCenter = true
      }
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
            eventStart_gte: new Date(),
            hasLocation: true,
          },
        }
      },
      update({ User, Group, Post }) {
        this.users = User
        this.groups = Group
        this.posts = Post
        this.addMarkersOnCheckPrepared()
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>
<!-- eslint-enable vue/no-reserved-component-names -->

<style lang="scss">
// description: https: //github.com/geospoc/v-mapbox/tree/v1.11.2/docs
//   code example: https: //codesandbox.io/embed/v-mapbox-map-demo-k1l1n?autoresize=1&fontsize=14&hidenavigation=1&theme=dark
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
}

.mgl-map-wrapper {
  flex: 1;
  min-height: 0;
}

.mapboxgl-popup-close-button {
  font-size: 1.2rem;
  padding: 2px 6px;
}

// Smaller geocoder on mobile (expanded)
@media (max-width: 810px) {
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
    background-color: white;
    border-radius: 4px;
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
  border-radius: 4px;
  z-index: 1;
  font-size: 0.8rem;
  color: $color-neutral-10;
}

.map-legend-toggle {
  display: none;
  width: 100%;
  padding: 4px 8px;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: $color-neutral-100;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;

  &:hover,
  &:active {
    background: rgba(0, 0, 0, 0.55);
  }
}

.map-legend-arrow {
  float: right;
  font-size: 0.7rem;
}

.map-legend-content {
  padding: 4px 8px;
}

.map-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 639px) {
  .map-legend-toggle {
    display: block;
  }

  .map-legend--open .map-legend-content {
    border-top: 1px solid #eee;
  }
}

.map-style-switcher {
  position: relative;
  background: white;
  border-radius: 4px;
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
  background: white;
  border-radius: 4px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;

  &--open {
    display: block;
  }
}

.map-style-popover-btn {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  &--active {
    font-weight: bold;
    background: rgba(0, 0, 0, 0.08);
  }
}

</style>

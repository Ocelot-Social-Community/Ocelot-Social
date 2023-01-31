<!-- Example Reference: https://codesandbox.io/s/v-mapbox-with-nuxt-lbrt6?file=/pages/index.vue -->
<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('map.pageTitle') }}</ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <client-only v-if="!isEmpty($env.MAPBOX_TOKEN)">
      <map-styles-buttons
        v-if="isMobile"
        :styles="styles"
        :actualStyle="mapOptions.style"
        :setStyle="setStyle"
      />
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
        <map-styles-buttons
          v-if="!isMobile"
          :styles="styles"
          :actualStyle="mapOptions.style"
          :setStyle="setStyle"
        />
        <MglFullscreenControl />
        <MglNavigationControl position="top-right" />
        <MglGeolocateControl position="top-right" />
        <MglScaleControl />
      </mgl-map>
    </client-only>
    <empty v-else icon="alert" :message="$t('map.alertMessage')" />
  </div>
</template>

<script>
import isEmpty from 'lodash/isEmpty'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { mapGetters } from 'vuex'
import { objectValuesToArray } from '~/utils/utils'
import { profileUserQuery, mapUserQuery } from '~/graphql/User'
import { groupQuery } from '~/graphql/groups'
import mobile from '~/mixins/mobile'
import Empty from '~/components/Empty/Empty'
import MapStylesButtons from '~/components/Map/MapStylesButtons'

const maxMobileWidth = 639 // on this width and smaller the mapbox 'MapboxGeocoder' search gets bigger

export default {
  name: 'Map',
  mixins: [mobile(maxMobileWidth)],
  components: {
    Empty,
    MapStylesButtons,
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
      activeStyle: null,
      defaultCenter: [10.452764, 51.165707], // center of Germany: https://www.gpskoordinaten.de/karte/land/DE
      currentUserLocation: null,
      currentUserCoordinates: null,
      users: null,
      groups: null,
      markers: {
        icons: [
          {
            id: 'marker-blue',
            name: 'mapbox-marker-icon-20px-blue.png',
          },
          {
            id: 'marker-orange',
            name: 'mapbox-marker-icon-20px-orange.png',
          },
          {
            id: 'marker-green',
            name: 'mapbox-marker-icon-20px-green.png',
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
    this.currentUserLocation = await this.getUserLocation(this.currentUser.id)
    this.currentUserCoordinates = this.currentUserLocation
      ? this.getCoordinates(this.currentUserLocation)
      : null
    this.addMarkersOnCheckPrepared()
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
        this.groups
      )
    },
    styles() {
      return objectValuesToArray(this.availableStyles)
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
    onMapLoad({ map }) {
      this.map = map

      // set the default atmosphere style
      // this.map.setFog({}) // the package is probably to old, because of Vue2: https://docs.mapbox.com/mapbox-gl-js/example/globe/

      this.map.on('style.load', (value) => {
        // Triggered when `setStyle` is called.
        this.markers.isImagesLoaded = false
        this.markers.isSourceAndLayerAdded = false
        this.loadMarkesIconsAndAddMarkers()
      })

      // add search field for locations
      this.map.addControl(
        new MapboxGeocoder({
          accessToken: this.$env.MAPBOX_TOKEN,
          mapboxgl: this.mapboxgl,
        }),
      )

      // example for popup: https://docs.mapbox.com/mapbox-gl-js/example/popup-on-hover/
      // create a popup, but don't add it to the map yet
      this.markers.popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: true,
      })

      this.map.on('mouseenter', 'markers', (e) => {
        // if (e.features[0].properties.type !== 'theUser') {}
        if (this.popupOnLeaveTimeoutId) {
          clearTimeout(this.popupOnLeaveTimeoutId)
          this.popupOnLeaveTimeoutId = null
        }
        if (this.markers.popup.isOpen()) {
          this.map.getCanvas().style.cursor = ''
          this.markers.popup.remove()
        }

        // Change the cursor style as a UI indicator.
        this.map.getCanvas().style.cursor = 'pointer'

        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice()
        const markerTypeLabel =
          e.features[0].properties.type === 'group'
            ? this.$t('map.markerTypes.group')
            : e.features[0].properties.type === 'user'
            ? this.$t('map.markerTypes.user')
            : this.$t('map.markerTypes.theUser')
        const markerProfileLinkTitle =
          (e.features[0].properties.type === 'group' ? '&' : '@') + e.features[0].properties.slug
        const markerProfileLink =
          (e.features[0].properties.type === 'group' ? '/group' : '/profile') +
          `/${e.features[0].properties.id}/${e.features[0].properties.slug}`
        let description = `
          <div>
            <div>
              <b>${e.features[0].properties.name}</b> <i>(${markerTypeLabel})</i>
            </div>
            <div>
              <a href="${markerProfileLink}" target="_blank">${markerProfileLinkTitle}</a>
            </div>
          </div>
        `
        description +=
          e.features[0].properties.about && e.features[0].properties.about.length > 0
            ? `
            <hr>
            <div>
              ${e.features[0].properties.about}
            </div>`
            : ''

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        this.markers.popup.setLngLat(coordinates).setHTML(description).addTo(this.map)
      })

      this.map.on('mouseleave', 'markers', (e) => {
        if (this.markers.popup.isOpen()) {
          this.popupOnLeaveTimeoutId = setTimeout(() => {
            this.map.getCanvas().style.cursor = ''
            this.markers.popup.remove()
          }, 3000)
        }
      })

      this.loadMarkesIconsAndAddMarkers()
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
    loadMarkesIconsAndAddMarkers() {
      Promise.all(
        this.markers.icons.map(
          (marker) =>
            new Promise((resolve, reject) => {
              // our images have to be in the 'static/img/*' folder otherwise they are not reachable via URL
              this.map.loadImage('img/mapbox/marker-icons/' + marker.name, (error, image) => {
                if (error) throw error
                this.map.addImage(marker.id, image)
                resolve()
              })
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
          if (user.id !== this.currentUser.id && user.location) {
            this.markers.geoJSON.push({
              type: 'Feature',
              properties: {
                type: 'user',
                iconName: 'marker-green',
                iconRotate: 0.0,
                id: user.id,
                slug: user.slug,
                name: user.name,
                about: user.about,
              },
              geometry: {
                type: 'Point',
                coordinates: this.getCoordinates(user.location),
              },
            })
          }
        })
        // add markers for "groups"
        this.groups.forEach((group) => {
          if (group.location) {
            this.markers.geoJSON.push({
              type: 'Feature',
              properties: {
                type: 'group',
                iconName: 'marker-blue',
                iconRotate: 0.0,
                id: group.id,
                slug: group.slug,
                name: group.name,
                about: group.about,
              },
              geometry: {
                type: 'Point',
                coordinates: this.getCoordinates(group.location),
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
              about: this.currentUser.about,
            },
            geometry: {
              type: 'Point',
              coordinates: this.currentUserCoordinates,
            },
          })
        }

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
    User: {
      query() {
        return mapUserQuery(this.$i18n)
      },
      variables() {
        return {}
      },
      update({ User }) {
        this.users = User
        this.addMarkersOnCheckPrepared()
      },
      fetchPolicy: 'cache-and-network',
    },
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {}
      },
      update({ Group }) {
        this.groups = Group
        this.addMarkersOnCheckPrepared()
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss">
// description: https: //github.com/geospoc/v-mapbox/tree/v1.11.2/docs
//   code example: https: //codesandbox.io/embed/v-mapbox-map-demo-k1l1n?autoresize=1&fontsize=14&hidenavigation=1&theme=dark
@import 'mapbox-gl/dist/mapbox-gl.css';
@import 'v-mapbox/dist/v-mapbox.css';

.mgl-map-wrapper {
  height: 70vh;
}
</style>

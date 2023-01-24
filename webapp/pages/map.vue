<!-- Example Reference: https://codesandbox.io/s/v-mapbox-with-nuxt-lbrt6?file=/pages/index.vue -->
<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('map.pageTitle') }}</ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <client-only>
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
        <!-- may use MglPopup for the styles? -->
        <ds-button
          class="style-button"
          v-for="style in styles.available"
          :key="style.title"
          filled
          size="small"
          :primary="mapOptions.style === style.url ? true : false"
          @click="setStyle(style.url)"
        >
          {{ style.title }}
        </ds-button>
        <!-- Wolle: is MglAttributionControl needed? or what can we use it for? -->
        <!-- <MglAttributionControl /> -->
        <MglFullscreenControl />
        <MglNavigationControl position="top-right" />
        <MglGeolocateControl position="top-right" />
        <MglScaleControl />
      </mgl-map>
    </client-only>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
// import MapboxLanguage from '@mapbox/mapbox-gl-language'
import { objectValuesToArray } from '../utils/utils'
import { mapGetters } from 'vuex'
import { profileUserQuery, mapUserQuery } from '~/graphql/User'
import { groupQuery } from '~/graphql/groups'

export default {
  name: 'Map',
  head() {
    return {
      title: this.$t('map.pageTitle'),
    }
  },
  data() {
    return {
      mapboxgl,
      activeStyle: null,
      defaultCenter: [10.452764, 51.165707], // center of Germany: https://www.gpskoordinaten.de/karte/land/DE
      currentUserLocation: null,
      currentUserCoordinates: null,
      users: null,
      groups: null,
      markers: {
        geoJSON: [],
        isAdded: false,
        isImagesAdded: false,
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
    styles() {
      return {
        available: objectValuesToArray(this.availableStyles),
      }
    },
    availableStyles() {
      // https://docs.mapbox.com/api/maps/styles/
      const availableStyles = {
        outdoors: {
          url: 'mapbox://styles/mapbox/outdoors-v12?optimize=true',
        },
        streets: {
          url: 'mapbox://styles/mapbox/streets-v11?optimize=true',
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
        accessToken: this.$env.MAPBOX_TOKEN,
        style: !this.activeStyle ? this.availableStyles.outdoors.url : this.activeStyle,
        center: this.mapCenter,
        zoom: this.mapZoom,
        maxZoom: 22,
      }
    },
    mapCenter() {
      return this.currentUserCoordinates ? this.currentUserCoordinates : this.defaultCenter
    },
    mapZoom() {
      return this.currentUserCoordinates ? 10 : 4
    },
  },
  methods: {
    onMapLoad({ map }) {
      this.map = map

      // // documentation of correct version: https://github.com/mapbox/mapbox-gl-language/tree/v0.10.0
      // // Add RTL support if you want to support Arabic
      // // Wolle: does not work yet
      // // mapboxgl.accessToken = this.$env.MAPBOX_TOKEN
      // // mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.1.0/mapbox-gl-rtl-text.js')
      // const language = new MapboxLanguage({
      //   defaultLanguage: 'en', // Wolle
      //   // defaultLanguage: 'de', // Wolle
      //   // defaultLanguage: 'auto', // Wolle
      // })
      // this.language = language
      // this.map.addControl(language)
      // // console.log('this.map: ', this.map)
      // // console.log('this.language: ', this.language)
      // // is unclear, how to
      // // this.language.setLanguage('de') // makes error

      // add search field for locations
      this.map.addControl(
        new MapboxGeocoder({
          accessToken: this.$env.MAPBOX_TOKEN,
          mapboxgl: this.mapboxgl,
        }),
      )
      // load markers
      const markers = [
        {
          id: 'marker-blue',
          name: 'mapbox-marker-icon-20px-blue.png',
        },
        {
          id: 'marker-red',
          name: 'mapbox-marker-icon-20px-red.png',
        },
        {
          id: 'marker-green',
          name: 'mapbox-marker-icon-20px-green.png',
        },
      ]
      Promise.all(
        markers.map(
          (marker) =>
            new Promise((resolve, reject) => {
              // our images have to be in the 'static/img/*' folder otherwise they are not reachable via URL
              map.loadImage('img/mapbox/marker-icons/' + marker.name, (error, image) => {
                if (error) throw error
                map.addImage(marker.id, image)
                resolve()
              })
            }),
        ),
      ).then(() => {
        this.markers.isImagesAdded = true
        this.addMarkersOnCheckPrepared()
      })
    },
    setStyle(url) {
      this.map.setStyle(url)
      this.activeStyle = url
    },
    addMarkersOnCheckPrepared() {
      if (
        !this.markers.isAdded &&
        this.map &&
        this.markers.isImagesAdded &&
        this.currentUser &&
        this.users &&
        this.groups
      ) {
        // add marker for "currentUser"
        if (this.currentUserCoordinates) {
          this.markers.geoJSON.push({
            type: 'Feature',
            properties: {
              type: 'the-user',
              iconName: 'marker-blue',
              title: this.currentUser.name,
            },
            geometry: {
              type: 'Point',
              coordinates: this.currentUserCoordinates,
            },
          })
        }
        // add markers for "users"
        this.users.forEach((user) => {
          if (user.id !== this.currentUser.id && user.location) {
            this.markers.geoJSON.push({
              type: 'Feature',
              properties: {
                type: 'user',
                iconName: 'marker-red',
                title: user.name,
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
                iconName: 'marker-green',
                title: group.name,
              },
              geometry: {
                type: 'Point',
                coordinates: this.getCoordinates(group.location),
              },
            })
          }
        })

        // add source and layer
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
            // get the "icon-image" from the source's "iconName" property
            'icon-image': ['get', 'iconName'],
            'icon-size': 1.0,
            // get the "text-field" from the source's "title" property
            'text-field': ['get', 'title'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 0],
            'text-anchor': 'top',
          },
        })

        this.markers.isAdded = true

        this.mapFlyToCenter()
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
.style-button {
  margin-left: 5px;
  margin-top: 5px;
}
</style>

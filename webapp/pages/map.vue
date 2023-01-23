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
        <!-- may use MglPopup for the styles -->
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
        <!-- Wolle: is MglAttributionControl needed? or what can we use for? -->
        <!-- <MglAttributionControl /> -->
        <MglFullscreenControl />
        <MglNavigationControl position="top-right" />
        <MglGeolocateControl position="top-right" />
        <MglScaleControl />
        <!-- <div v-for="group in groups" :key="group.id">
          <MglMarker
            v-if="group.location"
            :coordinates="getCoordinates(group.location)"
            :scale="0.75"
            :color="'green'"
          />
        </div>
        <div v-for="user in users" :key="user.id">
          <MglMarker
            v-if="user.id !== currentUser.id && user.location"
            :coordinates="getCoordinates(user.location)"
            :scale="0.75"
            :color="'blue'"
          />
        </div>
        < !-- have this as last to have the users marker in front of all others -- >
        <MglMarker
          v-if="currentUserCoordinates"
          :coordinates="currentUserCoordinates"
          :color="'red'"
        /> -->
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
        array: [],
        isCurrentUserAdded: false,
        isUsersAdded: false,
        isGroupsAdded: false,
      },
    }
  },
  async mounted() {
    this.currentUserLocation = await this.getUserLocation(this.currentUser.id)
    this.currentUserCoordinates = this.currentUserLocation
      ? this.getCoordinates(this.currentUserLocation)
      : null
    this.mapFlyToCenter()
    this.addMissingMarkers()
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
      this.map.addControl(
        new MapboxGeocoder({
          accessToken: this.$env.MAPBOX_TOKEN,
          mapboxgl,
        }),
      )
      this.mapFlyToCenter()
      this.addMissingMarkers()
    },
    setStyle(url) {
      this.map.setStyle(url)
      this.activeStyle = url
    },
    addMissingMarkers() {
      if (this.map) {
        if (!this.markers.isCurrentUserAdded && this.currentUserCoordinates) {
          this.markers.array.push(new mapboxgl.Marker())
          this.markers.array[this.markers.array.length - 1]
            .setLngLat(this.currentUserCoordinates)
            .addTo(this.map)
          this.markers.isCurrentUserAdded = true
        }
        if (!this.markers.isUsersAdded && this.currentUser && this.users) {
          this.users.forEach((user, index) => {
            if (user.id !== this.currentUser.id && user.location) {
              this.markers.array.push(
                new mapboxgl.Marker({
                  // Wolle: coordinates: this.getCoordinates(user.location),
                  scale: 0.75,
                  color: 'blue',
                }),
              )
              this.markers.array[this.markers.array.length - 1]
                .setLngLat(this.getCoordinates(user.location))
                .addTo(this.map)
            }
          })
          this.markers.isUsersAdded = true
        }
        if (!this.markers.isGroupsAdded && this.groups) {
          this.groups.forEach((group, index) => {
            if (group.location) {
              this.markers.array.push(
                new mapboxgl.Marker({
                  // Wolle: coordinates: this.getCoordinates(group.location),
                  scale: 0.75,
                  color: 'green',
                }),
              )
              this.markers.array[this.markers.array.length - 1]
                .setLngLat(this.getCoordinates(group.location))
                .addTo(this.map)
            }
          })
          this.markers.isGroupsAdded = true
        }
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
        this.addMissingMarkers()
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
        this.addMissingMarkers()
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

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
        <MglScaleControl />
        <MglNavigationControl position="top-right" />
        <MglGeolocateControl position="top-right" />
        <MglMarker :coordinates="[10.452764, 51.165707]" color="blue" />
      </mgl-map>
    </client-only>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import { objectValuesToArray } from '../utils/utils'

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
    }
  },
  computed: {
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
        center: [10.452764, 51.165707], // center of Germany: https://www.gpskoordinaten.de/karte/land/DE
        zoom: 4,
        maxZoom: 22,
      }
    },
  },
  methods: {
    onMapLoad({ map }) {
      this.map = map
    },
    setStyle(url) {
      this.map.setStyle(url)
      this.activeStyle = url
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

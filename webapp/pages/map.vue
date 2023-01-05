<!-- Example Reference: https://codesandbox.io/s/v-mapbox-with-nuxt-lbrt6?file=/pages/index.vue -->
<template>
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
      <!-- TODO: Move into mapboxgl-control-container -->
      <div class="map-controls">
        <ds-button
          v-for="style in styles.available"
          :key="style.title"
          filled
          size="small"
          :primary="mapOptions.style === style.url ? true : false"
          @click="setStyle(style.url)"
        >
          {{ style.title }}
        </ds-button>
      </div>
    </mgl-map>
  </client-only>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import { objectValuesToArray } from '../utils/utils'

export default {
  name: 'Map',
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
        center: [10.452764, 51.165707], // center of Germany
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
.mapboxgl-canvas {
  height: 70vh;
}
.map-controls {
  position: absolute;
  top: 100px;
  padding-left: 3px;
}
.map-controls button {
  margin-left: 5px;
}
.mapboxgl-control-container {
  margin-top: -45px;
}
.mapboxgl-control-container a {
  color: black;
}
</style>

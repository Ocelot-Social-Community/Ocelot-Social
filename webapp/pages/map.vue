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
export default {
  name: 'Map',
  data() {
    return {
      mapboxgl,
      mapOptions: {
        accessToken:
          'pk.eyJ1IjoiYnVzZmFrdG9yIiwiYSI6ImNraDNiM3JxcDBhaWQydG1uczhpZWtpOW4ifQ.7TNRTO-o9aK1Y6MyW_Nd4g', // ocelot-token
        style: 'mapbox://styles/mapbox/outdoors-v12?optimize=true',
        center: [10.452764, 51.165707], // center of Germany
        zoom: 4,
        maxZoom: 22,
      },
      styles: {
        // https://docs.mapbox.com/api/maps/styles/
        available: [
          {
            title: 'Outdoors',
            url: 'mapbox://styles/mapbox/outdoors-v12?optimize=true',
          },
          {
            title: 'Streets',
            url: 'mapbox://styles/mapbox/streets-v11?optimize=true',
          },
          {
            title: 'Satellite',
            url: 'mapbox://styles/mapbox/satellite-streets-v11?optimize=true',
          },
          {
            title: 'Dark',
            url: 'mapbox://styles/mapbox/dark-v10?optimize=true',
          },
        ],
      },
    }
  },
  methods: {
    onMapLoad({ map }) {
      this.map = map
    },
    setStyle(url) {
      this.map.setStyle(url)
      this.mapOptions.style = url
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
  left: 50px;
  top: 100px;
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

<template>
  <div style="height: 350px">
      <l-map
          ref="map"
          :zoom="zoom"
          :center="center"
          :options="{ zoomControl: true, attributionControl: true }"
          :marker-zoom-animation="true"
          @click="addMarker"
          @update:zoom="zoomUpdated"
          @update:center="centerUpdated"
      >
          <l-tile-layer :url="url" :attribution="attribution" />
          <l-marker ref="marker" :lat-lng="marker" draggable @update:lat-lng="latLngUpdate">
              <l-popup ref="popup"> {{ title }} </l-popup>
          </l-marker>
      </l-map>
  </div>
</template>
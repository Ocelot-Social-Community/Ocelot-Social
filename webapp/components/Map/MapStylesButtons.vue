<template>
  <div>
    <os-button
      v-for="style in styles"
      :key="style.title"
      :appearance="actualStyle === style.url ? 'filled' : 'outline'"
      variant="primary"
      size="sm"
      class="map-style-button"
      @click="setStyle(style.url)"
    >
      {{ style.title }}
    </os-button>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  components: { OsButton },
  name: 'MapStylesButtons',
  props: {
    styles: { type: Array, required: true },
    actualStyle: { type: String, required: true },
    setStyle: { type: Function, required: true },
  },
}
</script>

<style lang="scss">
// Outline (nicht ausgewählt) button styles
button.map-style-button.bg-transparent {
  background-color: $background-color-softer !important;
  color: $text-color-base !important;
}

button.map-style-button.bg-transparent:hover {
  background-color: $color-primary-light !important;
  border-color: $color-primary-light !important;
  color: white !important;
}

button.map-style-button.bg-transparent:active {
  background-color: $color-primary-dark !important;
  border-color: $color-primary-dark !important;
  color: white !important;
}

.map-style-button {
  position: relative;
  margin-left: 6px;
  margin-bottom: 6px;
  margin-top: 6px;
}
</style>

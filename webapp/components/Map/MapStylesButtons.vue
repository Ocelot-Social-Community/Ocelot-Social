<template>
  <div>
    <os-button
      :custom-class="'map-style-button' + (actualStyle === style.url ? '' : ' --deactivated')"
      v-for="style in styles"
      :key="style.title"
      variant="primary"
      size="sm"
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
.map-style-button {
  position: relative;
  margin-left: 6px;
  margin-bottom: 6px;
  margin-top: 6px;

  &.--deactivated {
    color: $text-color-base;
    background-color: $background-color-softer;
  }
}
</style>

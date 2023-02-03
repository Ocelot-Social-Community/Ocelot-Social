<template>
  <div>
    <base-button
      :class="['map-style-button', actualStyle === style.url ? '' : '--deactivated']"
      v-for="style in styles"
      :key="style.title"
      filled
      size="small"
      @click="setStyle(style.url)"
    >
      {{ style.title }}
    </base-button>
  </div>
</template>

<script>
export default {
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

<template>
  <div>
    <nuxt-link to="/map">
      <base-button
        class="map-button"
        circle
        ghost
        v-tooltip="{
          content: $t('map.button.tooltip'),
          placement: 'bottom-start',
        }"
      >
        <base-icon name="globe-detailed" size="large" />
      </base-button>
    </nuxt-link>
  </div>
</template>

<script>
export default {
  name: 'MapButton'
}
</script>

<style lang="scss">
.map-button {
  margin-left: 4px;
  margin-right: 4px;
}
</style>

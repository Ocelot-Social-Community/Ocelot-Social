<template>
  <div>
    <nuxt-link to="/map">
      <os-button
        class="map-button"
        variant="primary"
        appearance="ghost"
        circle
        v-tooltip="{
          content: $t('header.map.tooltip'),
          placement: 'bottom-start',
        }"
      >
        <base-icon name="globe-detailed" size="large" style="margin-left: 0 !important" />
      </os-button>
    </nuxt-link>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  name: 'MapButton',
  components: { OsButton },
}
</script>

<style lang="scss">
.map-button {
  margin-left: 4px;
  margin-right: 4px;

  .base-icon > .svg.--large {
    margin-left: 0;
  }
}
</style>

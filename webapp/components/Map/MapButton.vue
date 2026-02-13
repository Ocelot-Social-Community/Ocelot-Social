<template>
  <div>
    <nuxt-link to="/map">
      <os-button
        class="map-button"
        variant="primary"
        appearance="ghost"
        circle
        :aria-label="$t('header.map.tooltip')"
        v-tooltip="{
          content: $t('header.map.tooltip'),
          placement: 'bottom-start',
        }"
      >
        <template #icon>
          <base-icon name="globe-detailed" size="large" />
        </template>
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
  margin-left: 3px;
  margin-right: 3px;

  .base-icon > .svg.--large {
    margin-left: 0;
  }
}
</style>

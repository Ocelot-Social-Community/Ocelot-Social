<template>
  <div>
    <a v-if="settings.url" :href="settings.url" :target="settings.target">
      <os-button
        class="custom-button"
        appearance="ghost"
        circle
        v-tooltip="{
          content: $t(settings.toolTipIdent),
          placement: 'bottom-start',
        }"
      >
        <img
          class="logo-svg"
          :src="settings.iconPath"
          :alt="settings.iconAltText"
          :style="logoWidthStyle"
        />
      </os-button>
    </a>
    <nuxt-link v-else :to="settings.path">
      <os-button
        class="custom-button"
        appearance="ghost"
        circle
        v-tooltip="{
          content: $t(settings.toolTipIdent),
          placement: 'bottom-start',
        }"
      >
        <img
          class="logo-svg"
          :src="settings.iconPath"
          :alt="settings.iconAltText"
          :style="logoWidthStyle"
        />
      </os-button>
    </nuxt-link>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import isEmpty from 'lodash/isEmpty'

export default {
  components: { OsButton },
  name: 'CustomButton',
  props: {
    settings: { type: Object, required: true },
  },
  data() {
    return {
      isEmpty,
    }
  },
  computed: {
    logoWidthStyle() {
      const width = this.isEmpty(this.settings.iconWidth) ? '26px' : this.settings.iconWidth
      return `width: ${width};`
    },
  },
}
</script>

<style lang="scss">
.custom-button {
  margin-left: 4px;
  margin-right: 4px;
}

.logo-svg {
  height: auto;
  fill: #000000;
}
</style>

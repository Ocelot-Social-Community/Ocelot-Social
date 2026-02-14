<template>
  <div>
    <os-button
      v-if="settings.url"
      as="a"
      :href="settings.url"
      :target="settings.target"
      class="custom-button"
      variant="primary"
      appearance="ghost"
      circle
      :aria-label="$t(settings.toolTipIdent)"
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
    <os-button
      v-else
      as="nuxt-link"
      :to="settings.path"
      class="custom-button"
      variant="primary"
      appearance="ghost"
      circle
      :aria-label="$t(settings.toolTipIdent)"
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
  computed: {
    logoWidthStyle() {
      const width = isEmpty(this.settings.iconWidth) ? '26px' : this.settings.iconWidth
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

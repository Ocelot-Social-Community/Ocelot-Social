<template>
  <div>
    <os-button
      :as="linkTag"
      v-bind="linkProps"
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
    linkTag() {
      return this.settings.url ? 'a' : 'nuxt-link'
    },
    linkProps() {
      return this.settings.url
        ? { href: this.settings.url, target: this.settings.target }
        : { to: this.settings.path }
    },
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

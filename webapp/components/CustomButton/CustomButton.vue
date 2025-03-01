<template>
  <div>
    <a v-if="settings.url" :href="settings.url" :target="settings.target">
      <base-button
        class="custom-button"
        circle
        ghost
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
      </base-button>
    </a>
    <nuxt-link v-else :to="settings.toolTipIdent">
      <base-button
        class="custom-button"
        circle
        ghost
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
      </base-button>
    </nuxt-link>
  </div>
</template>

<script>
import isEmpty from 'lodash/isEmpty'

export default {
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

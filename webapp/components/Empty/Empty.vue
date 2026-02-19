<template>
  <div>
    <div class="hc-empty ds-space-centered" :class="'ds-my-' + margin">
      <p class="ds-text">
        <img
          :src="iconPath"
          width="80"
          class="hc-empty-icon"
          style="margin-bottom: 5px"
          alt="Empty"
        />
        <br />
        <span class="ds-text-softer hc-empty-message" v-show="message">
          {{ message }}
        </span>
      </p>
    </div>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'HcEmpty',
  props: {
    /**
     * Icon that should be shown
     * @options messages|events|alert|tasks|docs|file
     */
    icon: {
      type: String,
      default: 'alert',
      validator: (value) => {
        return value.match(/(messages|events|alert|tasks|docs|file)/)
      },
    },
    /**
     * Message that appears under the icon
     */
    message: {
      type: String,
      default: null,
    },
    /**
     * Vertical spacing
     */
    margin: {
      type: String,
      default: 'x-large',
    },
  },
  computed: {
    iconPath() {
      return `/img/empty/${this.icon}.svg`
    },
  },
}
</script>

<style lang="scss">
.hc-empty-icon {
  padding-bottom: $font-space-large;
}
</style>

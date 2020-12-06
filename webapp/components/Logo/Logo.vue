<template>
  <component :is="tag" class="ds-logo" :class="[inverse && 'ds-logo-inverse']">
    <svg-logo v-if="!inverse" class="ds-logo-svg" />
    <svg-logo-inverse v-else class="ds-logo-svg" />
  </component>
</template>

<script>
import svgLogo from '~/static/img/custom/Logo-Horizontal.svg'
import svgLogoInverse from '~/static/img/custom/Logo-Horizontal-Dark.svg'
/**
 * This component displays the brand's logo.
 * @version 1.0.0
 */
export default {
  name: 'Logo',
  components: {
    svgLogo,
    svgLogoInverse,
  },
  props: {
    /**
     * Inverse the logo
     */
    inverse: {
      type: Boolean,
      default: false,
    },
    /**
     * The html element name used for the logo.
     */
    tag: {
      type: String,
      default: 'div',
    },
  },
}
</script>

<style lang="scss">
.ds-logo {
  @include reset;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: $text-color-primary;
}

.ds-logo-inverse {
  color: $text-color-primary-inverse;
}

.ds-logo-svg {
  width: 130px;
  height: auto;
  fill: currentColor;
}
</style>

<docs src="./demo.md"></docs>

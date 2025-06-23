<template>
  <component
    :is="ordered ? 'ol' : 'ul'"
    class="ds-list"
    :class="[
      size && `ds-list-size-${size}`
  ]">
    <slot />
  </component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * Used in combination with the list item component to display lists of data.
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsList',

  provide() {
    return {
      $parentList: this
    }
  },

  inject: {
    $parentList: {
      default: null
    }
  },

  props: {
    /**
     * Whether or not the list is ordered.
     */
    ordered: {
      type: Boolean,
      default: false
    },
    /**
     * The size used for the list.
     * @options small|base|large|x-large
     */
    size: {
      type: String,
      default: null,
      validator: value => {
        return value.match(/(small|base|large|x-large)/)
      }
    },
    /**
     * The name of the list icon.
     */
    icon: {
      type: String,
      default: 'angle-right'
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>

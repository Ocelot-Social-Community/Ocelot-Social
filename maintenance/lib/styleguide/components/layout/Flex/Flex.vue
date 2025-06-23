<template>
  <component
    :is="tag"
    :style="styles"
    class="ds-flex">
    <slot />
  </component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { getSpace } from '@@/utils'
import { mediaQuery } from '@@/mixins'

/**
 * Used in combination with the flex item component to create flexible layouts.
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsFlex',
  mixins: [mediaQuery],

  provide() {
    return {
      $parentFlex: this
    }
  },

  props: {
    /**
     * Default gutter size of columns
     */
    gutter: {
      type: [String, Object],
      default: null
    },
    /**
     * Default width of columns
     */
    width: {
      type: [String, Number, Object],
      default: 1
    },
    /**
     * Direction of the flex items
     * @options row|row-reverse|column|column-reverse
     */
    direction: {
      type: [String, Object],
      default: null
    },
    /**
     * The outtermost html tag
     */
    tag: {
      type: String,
      default: 'div'
    }
  },

  computed: {
    styles() {
      const gutter = this.mediaQuery(this.gutter)
      const direction = this.mediaQuery(this.direction)
      const gutterStyle = gutter ? this.parseGutter(gutter) : {}
      const directionStyle = direction ? this.parseDirection(direction) : {}
      return {
        ...gutterStyle,
        ...directionStyle
      }
    }
  },

  methods: {
    parseGutter(gutter: string) {
      const realGutter = getSpace(gutter)
      return {
        marginLeft: `-${realGutter / 2}px`,
        marginRight: `-${realGutter / 2}px`
      }
    },
    parseDirection(direction: string) {
      return {
        flexDirection: direction
      }
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>


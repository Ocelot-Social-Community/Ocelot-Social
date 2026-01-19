<template>
  <component
    :is="tag"
    class="ds-grid"
    :style="styles"
  >
    <slot />
  </component>
</template>

<script>
import { getSpace } from '@@/utils'

/**
 * Used in combination with the grid item component to create masonry layouts.
 * @version 1.0.0
 */

export default {
  name: 'DsGrid',
  props: {
    /**
     * The vertical and horizontal gap between grid items
     * @options xxx-small|xx-small|x-small|small|base|large|x-large|xx-large|xxx-large
     */
    gap: {
      type: String,
      default: 'small',
      validator: value => (
        value.match(/(xxx-small|xx-small|x-small|small|base|large|x-large|xx-large|xxx-large)/)
      )
    },
    /**
     * The minimum width of each column
     */
    minColumnWidth: {
      type: Number,
      default: 250,
    },
    /**
     * The height of each row (recommended to use the default)
     */
    rowHeight: {
      type: Number,
      default: 20,
    },
    /**
     * The outermost html tag
     */
    tag: {
      type: String,
      default: 'div',
    },
  },
  computed: {
    styles() {
      return {
        gridTemplateColumns: `repeat(auto-fill, minmax(${this.minColumnWidth}px, 1fr))`,
        gridGap: `${getSpace(this.gap)}px`,
        gridAutoRows: `${this.rowHeight}px`,
      }
    }
  },
}
</script>

<style lang="scss" src="./style.scss">
</style>

<docs src="./demo.md"></docs>

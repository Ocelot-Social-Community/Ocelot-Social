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
/**
 * Used in combination with the grid item component to create masonry layouts.
 * @version 1.0.0
 */

export default {
  name: 'DsGrid',
  props: {
    /**
     * The vertical and horizontal gap between grid items
     */
    gap: {
      type: Number,
      default: 16, // TODO: how to use tokens.small here?
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
        gridTemplateColumns: `repeat(auto-fill, minmax(${this.minColumnWidth}px, 1fr`,
        gridGap: `${this.gap}px`,
        gridAutoRows: `${this.rowHeight}px`,
      }
    }
  },
}
</script>

<style lang="scss" src="./style.scss">
</style>

<docs src="./demo.md"></docs>

<template>
  <component
    :is="tag"
    :style="styles"
  >
    <slot />
  </component>
</template>

<script>
/**
 * @version 1.0.0
 * @see DsGrid
 */
export default {
  name: 'DsGridItem',
  props: {
    /**
     * The number of columns the item will span
     * @options 'fullWidth'|number
     */
    columnSpan: {
      type: [String, Number],
      default: 1,
    },
    /**
     * The number of rows the item will span
     */
    rowSpan: {
      type: Number,
      default: 4,
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
        gridRowEnd: `span ${this.rowSpan}`,
        gridColumnStart: this.columnSpan === 'fullWidth' ? 1 : 'auto',
        gridColumnEnd: this.columnSpan === 'fullWidth' ? -1 : `span ${this.columnSpan}`,
      }
    }
  },
}
</script>

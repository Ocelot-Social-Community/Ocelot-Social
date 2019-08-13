<template>
  <component
    :is="tag"
    :style="styles"
  >
    <slot />
  </component>
</template>

<script>
  export default {
    name: 'DsGridItem',
    props: {
      columnSpan: {
        type: [String, Number],
        default: 1,
      },
      rowSpan: {
        type: Number,
        default: 4,
      },
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

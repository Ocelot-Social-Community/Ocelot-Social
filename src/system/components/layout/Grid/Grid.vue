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
export default {
  name: 'DsGrid',
  props: {
    gap: {
      type: Number,
      default: 16, // TODO: how to use tokens.small here?
    },
    minColumnWidth: {
      type: Number,
      default: 300,
    },
    rowHeight: {
      type: Number,
      default: 20,
    },
    tag: {
      type: String,
      default: 'div',
    },
  },
  computed: {
    styles() {
      return ({
        gridTemplateColumns: `repeat(auto-fill, minmax(${this.minColumnWidth}px, 1fr`,
        gridGap: `${this.gap}px`,
        gridAutoRows: `${this.rowHeight}px`,
      })
    }
  }
}
</script>

<style lang="scss" src="./style.scss" />

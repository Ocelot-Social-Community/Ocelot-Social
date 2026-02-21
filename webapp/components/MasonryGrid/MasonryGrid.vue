<template>
  <div
    class="ds-grid"
    :style="{ gridAutoRows: '2px', rowGap: '2px' }"
    :class="[measuring ? 'reset-grid-height' : '']"
  >
    <slot></slot>
  </div>
</template>

<script>
const ROW_HEIGHT = 2
const ROW_GAP = 2

export default {
  data() {
    return {
      measuring: false,
      childCount: 0,
    }
  },
  mounted() {
    this.$nextTick(() => this.batchRecalculate())
    this._onResize = () => this.batchRecalculate()
    window.addEventListener('resize', this._onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this._onResize)
  },
  updated() {
    const count = this.$children.length
    if (count !== this.childCount) {
      this.batchRecalculate()
    }
  },
  methods: {
    async batchRecalculate() {
      this.childCount = this.$children.length
      // Switch to auto-height so items take their natural height
      this.measuring = true

      await this.$nextTick()

      // Read pass: measure all children in one go (single reflow)
      const measurements = this.$children.map((child) => ({
        child,
        height: child.$el.clientHeight,
      }))

      // Write pass: set all rowSpans (no interleaved reads)
      measurements.forEach(({ child, height }) => {
        if (child.rowSpan !== undefined) {
          child.rowSpan = Math.ceil((height + ROW_GAP) / (ROW_HEIGHT + ROW_GAP))
        }
      })

      // Switch back to fixed row grid
      this.measuring = false
    },
  },
}
</script>

<style lang="scss">
.ds-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  column-gap: 16px;

  @media (max-width: 810px) {
    column-gap: 8px;
  }
}

.reset-grid-height {
  grid-auto-rows: auto !important;
  align-items: self-start;
}
</style>

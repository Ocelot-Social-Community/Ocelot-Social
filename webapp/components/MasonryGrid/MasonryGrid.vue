<template>
  <div class="ds-grid" :style="gridStyle" :class="[measuring ? 'reset-grid-height' : '']">
    <slot></slot>
  </div>
</template>

<script>
const ROW_HEIGHT = 2
const ROW_GAP = 2

export default {
  props: {
    singleColumn: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      measuring: false,
      childCount: 0,
    }
  },
  computed: {
    gridStyle() {
      return {
        gridAutoRows: `${ROW_HEIGHT}px`,
        rowGap: `${ROW_GAP}px`,
        ...(this.singleColumn ? { gridTemplateColumns: '1fr' } : {}),
      }
    },
  },
  watch: {
    singleColumn() {
      this.$nextTick(() => this.batchRecalculate())
    },
  },
  mounted() {
    this.$nextTick(() => this.batchRecalculate())
    this._resizeTimer = null
    this._onResize = () => {
      clearTimeout(this._resizeTimer)
      this._resizeTimer = setTimeout(() => this.batchRecalculate(), 150)
    }
    window.addEventListener('resize', this._onResize)
  },
  beforeDestroy() {
    clearTimeout(this._resizeTimer)
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
      this._recalcId = (this._recalcId || 0) + 1
      const id = this._recalcId

      this.childCount = this.$children.length
      // Switch to auto-height so items take their natural height
      this.measuring = true

      await this.$nextTick()

      // A newer call has started — let it handle the measurement
      if (id !== this._recalcId) return

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
  min-width: 0;
  max-width: 100%;

  @media (max-width: 810px) {
    column-gap: 8px;
  }

  > * {
    min-width: 0;
  }
}

.reset-grid-height {
  grid-auto-rows: auto !important;
  align-items: self-start;
}
</style>

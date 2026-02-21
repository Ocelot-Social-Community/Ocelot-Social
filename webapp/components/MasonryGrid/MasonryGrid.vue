<template>
  <div
    class="ds-grid"
    :style="{ gridAutoRows: '20px', rowGap: '16px', columnGap: '16px' }"
    :class="[measuring ? 'reset-grid-height' : '']"
  >
    <slot></slot>
  </div>
</template>

<script>
const ROW_HEIGHT = 20
const ROW_GAP = 16

export default {
  data() {
    return {
      measuring: false,
      childCount: 0,
    }
  },
  mounted() {
    this.$nextTick(() => this.batchRecalculate())
  },
  updated() {
    const count = this.$children.length
    if (count !== this.childCount) {
      this.batchRecalculate()
    }
  },
  methods: {
    batchRecalculate() {
      this.childCount = this.$children.length
      // Switch to auto-height so items take their natural height
      this.measuring = true

      this.$nextTick(() => {
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
      })
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 810
    },
  },
  mounted() {
    this.checkMobile()
    // Children mount before parent — recalculate their spans with correct grid values
    this.$nextTick(() => {
      this.$children.forEach((child) => {
        if (child.calculateItemHeight) child.calculateItemHeight()
      })
    })
    window.addEventListener('resize', this.checkMobile)
  },
  beforeDestroy() {
    this.$off('calculating-item-height', this.startCalculation)
    this.$off('finished-calculating-item-height', this.endCalculation)
    window.removeEventListener('resize', this.checkMobile)
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

<template>
  <div
    class="ds-grid"
    :style="gridStyle"
    :class="[itemsCalculating ? 'reset-grid-height' : '']"
  >
    <slot></slot>
  </div>
</template>

<script>
export default {
  data() {
    return {
      itemsCalculating: 0,
      isMobile: false,
    }
  },
  computed: {
    gridStyle() {
      const size = this.isMobile ? '1px' : '2px'
      return { gridAutoRows: size, rowGap: size }
    },
  },
  watch: {
    isMobile() {
      this.$nextTick(() => {
        this.$children.forEach((child) => {
          if (child.calculateItemHeight) child.calculateItemHeight()
        })
      })
    },
  },
  created() {
    this.$on('calculating-item-height', this.startCalculation)
    this.$on('finished-calculating-item-height', this.endCalculation)
  },
  beforeDestroy() {
    this.$off('calculating-item-height', this.startCalculation)
    this.$off('finished-calculating-item-height', this.endCalculation)
  },
  methods: {
    startCalculation() {
      this.itemsCalculating += 1
    },
    endCalculation() {
      this.itemsCalculating -= 1
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

<template>
  <div
    class="ds-grid"
    :style="{ gridAutoRows: '2px', rowGap: '2px' }"
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
    }
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
  },
}
</script>

<style lang="scss">
.ds-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  column-gap: 16px;

  @media (max-width: 810px) {
    column-gap: 8px;
    row-gap: 1px !important;
    grid-auto-rows: 1px !important;
  }
}

.reset-grid-height {
  grid-auto-rows: auto !important;
  align-items: self-start;
}
</style>

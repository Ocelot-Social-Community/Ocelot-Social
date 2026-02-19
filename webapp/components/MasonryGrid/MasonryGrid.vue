<template>
  <div
    class="ds-grid"
    :style="{ gridAutoRows: '20px', rowGap: '16px', columnGap: '16px' }"
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
}

.reset-grid-height {
  grid-auto-rows: auto !important;
  align-items: self-start;
}
</style>

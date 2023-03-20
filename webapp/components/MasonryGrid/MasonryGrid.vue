<template>
  <ds-grid
    v-on:calculating-item-height="startCalculation"
    v-on:finished-calculating-item-height="endCalculation"
    :class="[itemsCalculating ? 'reset-grid-height' : '']"
  >
    <slot></slot>
  </ds-grid>
</template>

<script>
export default {
  data() {
    return {
      itemsCalculating: 0,
    }
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
/* dirty fix to override broken styleguide inline-styles */
.ds-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)) !important;
  gap: 32px 16px !important;
  grid-auto-rows: 20px;
}

.reset-grid-height {
  grid-auto-rows: auto !important;
  align-items: self-start;
}
</style>

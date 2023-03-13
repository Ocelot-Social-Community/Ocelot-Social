<template>
  <span>
    <base-button
      class="my-filter-button my-filter-button-selected"
      right
      @click="clickButton"
      filled
    >
      {{ title }}
    </base-button>
    <base-button
      class="filter-remove"
      @click="clickRemove"
      icon="close"
      :title="titleRemove"
      size="small"
      circle
      filled
    />
  </span>
</template>
<script>
export default {
  name: 'HeaderButton',
  props: {
    title: {
      type: String,
      required: true,
    },
    clickButton: {
      type: Function,
      required: true,
    },
    titleRemove: {
      type: String,
      required: true,
    },
    clickRemove: {
      type: Function,
      required: true,
    },
  },
}
</script>
<style lang="scss">
.my-filter-button-selected {
  padding-right: 30px;
}

.base-button.filter-remove {
  position: relative;
  margin-left: -31px;
  top: -5px;
  margin-right: 8px;
}
</style>

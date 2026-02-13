<template>
  <span class="header-button-wrapper">
    <os-button class="my-filter-button" variant="primary" appearance="filled" @click="clickButton">
      {{ title }}
    </os-button>
    <os-button
      class="filter-remove"
      variant="primary"
      appearance="filled"
      circle
      size="sm"
      :title="titleRemove"
      :aria-label="titleRemove"
      @click.stop="clickRemove"
    >
      <template #icon>
        <base-icon name="close" />
      </template>
    </os-button>
  </span>
</template>
<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  name: 'HeaderButton',
  components: { OsButton },
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
.header-button-wrapper {
  display: inline-flex;
  align-items: center;
  position: relative;
  margin-right: 8px;

  > .my-filter-button {
    padding-right: 36px !important;
  }

  > .filter-remove {
    position: absolute !important;
    right: 4px !important;
    top: 50% !important;
    transform: translateY(-50%);
  }
}
</style>

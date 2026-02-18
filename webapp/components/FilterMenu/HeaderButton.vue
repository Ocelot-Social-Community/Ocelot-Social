<template>
  <os-button class="my-filter-button" variant="primary" appearance="filled" @click="clickButton">
    {{ title }}
    <template #suffix>
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
          <os-icon :icon="icons.close" />
        </template>
      </os-button>
    </template>
  </os-button>
</template>
<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'HeaderButton',
  components: { OsButton, OsIcon },
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
  created() {
    this.icons = iconRegistry
  },
}
</script>

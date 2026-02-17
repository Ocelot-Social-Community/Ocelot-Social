<template>
  <div class="pagination-buttons">
    <os-button
      class="previous-button"
      :disabled="!hasPrevious"
      appearance="outline"
      variant="primary"
      circle
      data-test="previous-button"
      :aria-label="$t('pagination.previous')"
      @click="$emit('back')"
    >
      <template #icon><os-icon :icon="icons.arrowLeft" /></template>
    </os-button>

    <span v-if="showPageCounter" class="pagination-pageCount" data-test="pagination-pageCount">
      {{ $t('search.page') }} {{ activePage + 1 }} /
      {{ Math.floor((activeResourceCount - 1) / pageSize) + 1 }}
    </span>

    <os-button
      class="next-button"
      :disabled="!hasNext"
      appearance="outline"
      variant="primary"
      circle
      data-test="next-button"
      :aria-label="$t('pagination.next')"
      @click="$emit('next')"
    >
      <template #icon><os-icon :icon="icons.arrowRight" /></template>
    </os-button>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'

export default {
  components: {
    OsButton,
    OsIcon,
  },
  props: {
    pageSize: {
      type: Number,
      default: 24,
    },
    hasNext: {
      type: Boolean,
      default: false,
    },
    hasPrevious: {
      type: Boolean,
      default: false,
    },
    activePage: {
      type: Number,
      default: 0,
    },
    totalResultCount: {
      type: Number,
      default: 0,
    },
    activeResourceCount: {
      type: Number,
      default: 0,
    },
    showPageCounter: {
      type: Boolean,
      default: false,
    },
  },
  created() {
    this.icons = ocelotIcons
  },
}
</script>

<style lang="scss">
.pagination-buttons {
  display: flex;
  justify-content: space-around;
  width: $size-width-paginate;
  margin: $space-x-small auto;
}

.pagination-pageCount {
  justify-content: space-around;

  margin: 8px auto;
}
</style>

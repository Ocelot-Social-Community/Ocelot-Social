<template>
  <ocelot-pagination
    class="pagination-buttons"
    :icon-previous="icons.arrowLeft"
    :icon-next="icons.arrowRight"
    :label-previous="$t('pagination.previous')"
    :label-next="$t('pagination.next')"
    :has-previous="hasPrevious"
    :has-next="hasNext"
    :active-page="activePage"
    :page-size="pageSize"
    :active-resource-count="activeResourceCount"
    :show-page-counter="showPageCounter"
    :page-label="$t('search.page')"
    @back="$emit('back')"
    @next="$emit('next')"
  />
</template>

<script>
import { OcelotPagination } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  components: {
    OcelotPagination,
  },
  props: {
    pageSize: { type: Number, default: 24 },
    hasNext: { type: Boolean, default: false },
    hasPrevious: { type: Boolean, default: false },
    activePage: { type: Number, default: 0 },
    totalResultCount: { type: Number, default: 0 },
    activeResourceCount: { type: Number, default: 0 },
    showPageCounter: { type: Boolean, default: false },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style lang="scss">
.pagination-buttons {
  width: $size-width-paginate;
  margin: $space-x-small auto;
}
</style>

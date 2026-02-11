<template>
  <filter-menu-section class="order-by-filter" :title="sectionTitle" :divider="false">
    <template #filter-list>
      <li class="item">
        <os-button
          variant="primary"
          :appearance="orderBy === orderedDesc ? 'filled' : 'outline'"
          size="sm"
          :title="buttonTitle('desc')"
          @click="toggleOrder(orderedDesc)"
          data-test="newest-button"
        >
          <template #icon>
            <base-icon name="sort-amount-asc" />
          </template>
          {{ buttonLabel('desc') }}
        </os-button>
      </li>
      <li class="item">
        <os-button
          variant="primary"
          :appearance="orderBy === orderedAsc ? 'filled' : 'outline'"
          size="sm"
          :title="buttonTitle('asc')"
          @click="toggleOrder(orderedAsc)"
          data-test="oldest-button"
        >
          <template #icon>
            <base-icon name="sort-amount-desc" />
          </template>
          {{ buttonLabel('asc') }}
        </os-button>
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'

export default {
  name: 'OrderByFilter',
  components: {
    FilterMenuSection,
    OsButton,
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      orderBy: 'posts/orderBy',
    }),
    orderedByCreationDate() {
      return !this.filteredPostTypes.includes('Event')
    },
    orderedAsc() {
      return this.orderedByCreationDate ? 'sortDate_asc' : 'eventStart_desc'
    },
    orderedDesc() {
      return this.orderedByCreationDate ? 'sortDate_desc' : 'eventStart_asc'
    },
    sectionTitle() {
      return this.orderedByCreationDate
        ? this.$t('filter-menu.creationDate')
        : this.$t('filter-menu.startDate')
    },
  },
  methods: {
    ...mapMutations({
      toggleOrder: 'posts/TOGGLE_ORDER',
    }),
    buttonLabel(buttonType) {
      switch (buttonType) {
        case 'asc':
          return this.orderedByCreationDate
            ? this.$t('filter-menu.order.oldest.label')
            : this.$t('filter-menu.order.last.label')
        case 'desc':
          return this.orderedByCreationDate
            ? this.$t('filter-menu.order.newest.label')
            : this.$t('filter-menu.order.next.label')
        default:
          return ''
      }
    },
    buttonTitle(buttonType) {
      switch (buttonType) {
        case 'asc':
          return this.orderedByCreationDate
            ? this.$t('filter-menu.order.oldest.hint')
            : this.$t('filter-menu.order.last.hint')
        case 'desc':
          return this.orderedByCreationDate
            ? this.$t('filter-menu.order.newest.hint')
            : this.$t('filter-menu.order.next.hint')
        default:
          return ''
      }
    },
  },
}
</script>

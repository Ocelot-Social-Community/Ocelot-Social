<template>
  <filter-menu-section class="order-by-filter" :title="sectionTitle" :divider="false">
    <template #filter-list>
      <li class="item">
        <labeled-button
          icon="sort-amount-asc"
          :label="buttonLable('desc')"
          :filled="orderBy === orderedDesc"
          :title="buttonTitle('desc')"
          @click="setOrder(orderedDesc)"
          data-test="newest-button"
        />
      </li>
      <li class="item">
        <labeled-button
          icon="sort-amount-desc"
          :label="buttonLable('asc')"
          :filled="orderBy === orderedAsc"
          :title="buttonTitle('asc')"
          @click="setOrder(orderedAsc)"
          data-test="oldest-button"
        />
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import FilterMenuMixin from '~/mixins/filterMenuMixin.js'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'

export default {
  name: 'OrderByFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  mixins: [FilterMenuMixin],
  computed: {
    orderedAsc() {
      return this.orderedByCreationDate ? 'createdAt_asc' : 'eventStart_desc'
    },
    orderedDesc() {
      return this.orderedByCreationDate ? 'createdAt_desc' : 'eventStart_asc'
    },
    sectionTitle() {
      return this.orderedByCreationDate
        ? this.$t('filter-menu.creationDate')
        : this.$t('filter-menu.startDate')
    },
  },
  methods: {
    buttonLable(buttonType) {
      let title
      switch (buttonType) {
        case 'asc':
          return this.orderedByCreationDate ? this.$t('filter-menu.order.oldest.label') : this.$t('filter-menu.order.last.label')
        case 'desc':
          return this.orderedByCreationDate ? this.$t('filter-menu.order.newest.label') : this.$t('filter-menu.order.next.label')
        default:
          return ''
      }
    },
    buttonTitle(buttonType) {
      switch (buttonType) {
        case 'asc':
          return this.orderedByCreationDate ? this.$t('filter-menu.order.oldest.hint') : this.$t('filter-menu.order.last.hint')
        case 'desc':
          return this.orderedByCreationDate ? this.$t('filter-menu.order.newest.hint') : this.$t('filter-menu.order.next.hint')
        default:
          return ''
      }
    },
  },
}
</script>

<template>
  <filter-menu-section :divider="false" class="date-sort-filter">
    <template #filter-list>
      <!-- Wolle 👇🏼 translations & click
      <labeled-button
        icon="user-plus"
        :label="$t('filter-menu.following')"
        :filled="filteredByUsersFollowed"
        :title="$t('contribution.filterFollow')"
        @click="toggleFilteredByFollowed(currentUser.id)"
      /> -->
      <li class="item">
        <labeled-button
          icon="sort-amount-asc"
          :label="'Newest first'"
          :filled="orderBy === 'createdAt_desc'"
          :title="'Sort posts by the newest first'"
          @click="toggleOrder('createdAt_desc')"
        />
      </li>
      <li class="item">
        <labeled-button
          icon="sort-amount-desc"
          :label="'Oldest first'"
          :filled="orderBy === 'createdAt_asc'"
          :title="'Sort posts by the oldest first'"
          @click="toggleOrder('createdAt_asc')"
        />
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'

export default {
  name: 'DateSortFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  computed: {
    ...mapGetters({
      orderBy: 'posts/orderBy',
    }),
  },
  methods: {
    ...mapMutations({
      toggleOrder: 'posts/TOGGLE_ORDER',
    }),
  },
}
</script>

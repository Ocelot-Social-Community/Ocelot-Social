<template>
  <div>
    <div class="filter-menu-options">
      <h2 class="title">{{ $t('filter-menu.filter-by') }}</h2>
      <post-type-filter />
      <following-filter />
      <categories-filter v-if="categoriesActive" @showFilterMenu="$emit('showFilterMenu')" />
    </div>
    <div v-if="eventSetInPostTypeFilter" class="filter-menu-options">
      <h2 class="title">{{ $t('filter-menu.eventsBy') }}</h2>
      <events-by-filter />
    </div>
    <div class="filter-menu-options">
      <h2 class="title">{{ $t('filter-menu.order-by') }}</h2>
      <order-by-filter />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import EventsByFilter from './EventsByFilter'
import PostTypeFilter from './PostTypeFilter'
import FollowingFilter from './FollowingFilter'
import OrderByFilter from './OrderByFilter'
import CategoriesFilter from './CategoriesFilter'

export default {
  components: {
    EventsByFilter,
    FollowingFilter,
    OrderByFilter,
    CategoriesFilter,
    PostTypeFilter,
  },
  data() {
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
    }
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
    }),
    eventSetInPostTypeFilter() {
      return this.filteredPostTypes.includes('Event')
    },
  },
}
</script>

<style lang="scss">
.filter-menu-options {
  max-width: $size-max-width-filter-menu;
  padding: $space-small $space-x-small;

  > .title {
    font-size: $font-size-large;
  }
}
</style>

<template>
  <div>
    <div class="filter-menu-options">
      <div class="filter-header">
        <h2 class="title">{{ $t('filter-menu.filter-by') }}</h2>
        <div class="item-save-topics">
          <labeled-button
            filled
            :label="$t('actions.saveCategories')"
            icon="save"
            @click="saveCategories"
          />
        </div>
      </div>
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
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'
import SaveCategories from '~/graphql/SaveCategories.js'

export default {
  components: {
    EventsByFilter,
    FollowingFilter,
    OrderByFilter,
    CategoriesFilter,
    PostTypeFilter,
    LabeledButton,
  },
  data() {
    return {
      categoriesActive: this.$env ? this.$env.CATEGORIES_ACTIVE : false,
    }
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      filteredCategoryIds: 'posts/filteredCategoryIds',
    }),
    eventSetInPostTypeFilter() {
      return this.filteredPostTypes ? this.filteredPostTypes.includes('Event') : null
    },
  },
  methods: {
    saveCategories() {
      this.$apollo
        .mutate({
          mutation: SaveCategories(),
          variables: { activeCategories: this.filteredCategoryIds },
        })
        .then(() => {
          this.$emit('showFilterMenu')
          this.$toast.success(this.$t('filter-menu.save.success'))
        })
        .catch(() => {
          this.$toast.error(this.$t('filter-menu.save.error'))
        })
    },
  },
}
</script>

<style lang="scss">
.filter-header {
  display: flex;
  justify-content: space-between;
  & .labeled-button {
    margin-right: 2em;
  }
}
.filter-menu-options {
  max-width: $size-max-width-filter-menu;
  padding: $space-small $space-x-small;

  > .title {
    font-size: $font-size-large;
  }
}
</style>

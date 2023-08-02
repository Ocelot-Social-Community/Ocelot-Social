<template>
  <filter-menu-section :title="$t('filter-menu.categories')" class="categories-filter">
    <template #filter-list>
      <div class="item item-all-topics">
        <base-button
          :filled="!filteredCategoryIds.length"
          :label="$t('filter-menu.all')"
          icon="check"
          @click="setResetCategories"
          size="small"
        >
          {{ $t('filter-menu.all') }}
        </base-button>
      </div>
      <div class="category-filter-list">
        <!-- <ds-space margin="small" /> -->
        <base-button
          v-for="category in categories"
          :key="category.id"
          @click="saveCategories(category.id)"
          :filled="filteredCategoryIds.includes(category.id)"
          :icon="category.icon"
          size="small"
          v-tooltip="{
            content: $t(`contribution.category.description.${category.slug}`),
            placement: 'bottom-start',
          }"
        >
          {{ $t(`contribution.category.name.${category.slug}`) }}
        </base-button>
      </div>
    </template>
  </filter-menu-section>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import CategoryQuery from '~/graphql/CategoryQuery.js'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import SortCategories from '~/mixins/sortCategoriesMixin.js'

export default {
  components: {
    FilterMenuSection,
  },
  mixins: [SortCategories],
  data() {
    return {
      categories: [],
    }
  },
  computed: {
    ...mapGetters({
      filteredCategoryIds: 'posts/filteredCategoryIds',
    }),
  },
  methods: {
    ...mapMutations({
      resetCategories: 'posts/RESET_CATEGORIES',
      toggleCategory: 'posts/TOGGLE_CATEGORY',
    }),
    setResetCategories() {
      this.resetCategories()
      this.$emit('showFilterMenu')
    },
    saveCategories(categoryId) {
      this.toggleCategory(categoryId)
      this.$emit('updateCategories', categoryId)
    },
  },
  apollo: {
    Category: {
      query() {
        return CategoryQuery()
      },
      update({ Category }) {
        if (!Category) return []
        this.categories = this.sortCategories(Category)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>
<style lang="scss">
.category-filter-list {
  margin-left: $space-xx-small;

  > .base-button {
    margin-right: $space-xx-small;
    margin-bottom: $space-xx-small;
  }
}
</style>

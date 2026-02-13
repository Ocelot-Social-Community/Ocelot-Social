<template>
  <filter-menu-section :title="$t('filter-menu.categories')" class="categories-filter">
    <template #filter-list>
      <div class="item item-all-topics">
        <os-button
          variant="primary"
          :appearance="!filteredCategoryIds.length ? 'filled' : 'outline'"
          size="sm"
          @click="setResetCategories"
        >
          <template #icon>
            <base-icon name="check" />
          </template>
          {{ $t('filter-menu.all') }}
        </os-button>
      </div>
      <div class="category-filter-list">
        <!-- <ds-space margin="small" /> -->
        <os-button
          v-for="category in sortCategories(categories)"
          :key="category.id"
          variant="primary"
          :appearance="filteredCategoryIds.includes(category.id) ? 'filled' : 'outline'"
          size="sm"
          @click="saveCategories(category.id)"
          v-tooltip="{
            content: $t(`contribution.category.description.${category.slug}`),
            placement: 'bottom-start',
          }"
        >
          <template #icon>
            <base-icon :name="category.icon" />
          </template>
          {{ $t(`contribution.category.name.${category.slug}`) }}
        </os-button>
      </div>
    </template>
  </filter-menu-section>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import SortCategories from '~/mixins/sortCategoriesMixin.js'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  components: {
    FilterMenuSection,
    OsButton,
  },
  mixins: [SortCategories, GetCategories],
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
}
</script>
<style lang="scss">
.category-filter-list {
  margin-left: $space-xx-small;

  > button {
    margin-right: $space-xx-small;
    margin-bottom: $space-xx-small;
  }
}
</style>

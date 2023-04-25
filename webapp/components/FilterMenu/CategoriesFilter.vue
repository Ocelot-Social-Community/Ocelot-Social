<template>
  <filter-menu-section :title="$t('filter-menu.categories')" class="categories-filter">
    <template #filter-topics>
      <li class="item item-all-topics">
        <labeled-button
          :filled="!filteredCategoryIds.length"
          :label="$t('filter-menu.all')"
          icon="check"
          @click="setResetCategories"
        />
      </li>
      <li class="item item-save-topics">
        <labeled-button filled :label="$t('actions.save')" icon="save" @click="saveCategories" />
      </li>
      <hr />
      <ds-space margin="base" />
    </template>

    <template #filter-list>
      <div class="category-filter-list">
        <base-button
          v-for="category in categories"
          :key="category.id"
          @click="toggleCategory(category.id)"
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
import SaveCategories from '~/graphql/SaveCategories.js'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'
import SortCategories from '~/mixins/sortCategoriesMixin.js'

export default {
  components: {
    FilterMenuSection,
    LabeledButton,
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
  margin-left: $space-xx-large;

  > .base-button {
    margin-right: $space-xx-small;
    margin-bottom: $space-xx-small;
  }
}
</style>

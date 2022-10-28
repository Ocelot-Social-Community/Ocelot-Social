<template>
  <filter-menu-section :title="$t('filter-menu.categories')" class="categories-filter">
    <template #filter-themen>
      <li class="item item-all-themen">
        <labeled-button
          :filled="!filteredCategoryIds.length"
          :label="$t('filter-menu.all')"
          icon="check"
          @click="resetCategories"
        />
      </li>
      <li class="item item-save-themen">
        <labeled-button filled :label="$t('actions.save')" icon="save" @click="saveCategories" />
      </li>
    </template>

    <template #filter-list>
      <li v-for="category in categories" :key="category.id" class="item item-category">
        <labeled-button
          :icon="category.icon"
          :filled="filteredCategoryIds.includes(category.id)"
          :label="$t(`contribution.category.name.${category.slug}`)"
          @click="toggleCategory(category.id)"
          v-tooltip="{
            content: $t(`contribution.category.description.${category.slug}`),
            placement: 'bottom-start',
          }"
        />
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import CategoryQuery from '~/graphql/CategoryQuery.js'
import SaveCategories from '~/graphql/SaveCategories.js'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'

export default {
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  props: {
    showMobileMenu: { type: Boolean, default: false },
  },
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
    saveCategories() {
      this.$apollo
        .mutate({
          mutation: SaveCategories(),
          variables: { activeCategories: this.filteredCategoryIds },
        })
        .then(() => {
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
        this.categories = Category
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

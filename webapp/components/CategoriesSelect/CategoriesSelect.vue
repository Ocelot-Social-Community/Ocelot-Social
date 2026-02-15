<template>
  <section class="categories-select">
    <os-button
      v-for="category in sortCategories(categories)"
      :key="category.id"
      :data-test="categoryButtonsId(category.id)"
      @click="toggleCategory(category.id)"
      variant="primary"
      :appearance="isActive(category.id) ? 'filled' : 'outline'"
      :disabled="isDisabled(category.id)"
      size="sm"
      v-tooltip="{
        content: $t(`contribution.category.description.${category.slug}`),
        placement: 'bottom-start',
      }"
    >
      <template #icon><os-icon :icon="resolveIcon(category.icon)" /></template>
      {{ $t(`contribution.category.name.${category.slug}`) }}
    </os-button>
  </section>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import { CATEGORIES_MAX } from '~/constants/categories.js'
import xor from 'lodash/xor'
import SortCategories from '~/mixins/sortCategoriesMixin.js'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  inject: {
    $parentForm: {
      default: null,
    },
  },
  components: { OsButton, OsIcon },
  mixins: [SortCategories, GetCategories],
  props: {
    existingCategoryIds: { type: Array, default: () => [] },
    model: { type: String, required: true },
  },
  data() {
    return {
      selectedMax: CATEGORIES_MAX,
      selectedCategoryIds: this.existingCategoryIds,
    }
  },
  watch: {
    existingCategoryIds() {
      if (!this.selectedCategoryIds.length && this.existingCategoryIds.length) {
        this.selectedCategoryIds = this.existingCategoryIds
        this.$forceUpdate()
      }
    },
  },
  computed: {
    selectedCount() {
      return this.selectedCategoryIds.length
    },
    reachedMaximum() {
      return this.selectedCount >= this.selectedMax
    },
  },
  methods: {
    toggleCategory(id) {
      this.selectedCategoryIds = xor(this.selectedCategoryIds, [id])
      if (this.$parentForm) {
        this.$parentForm.update(this.model, this.selectedCategoryIds)
      }
    },
    isActive(id) {
      return this.selectedCategoryIds.includes(id)
    },
    isDisabled(id) {
      return !!(this.reachedMaximum && !this.isActive(id))
    },
    categoryButtonsId(categoryId) {
      return `category-buttons-${categoryId}`
    },
    resolveIcon(iconName) {
      const camel = iconName
        .split('-')
        .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
        .join('')
      return ocelotIcons[camel]
    },
  },
}
</script>

<style lang="scss">
.categories-select {
  display: flex;
  flex-wrap: wrap;

  > button {
    margin-right: $space-xx-small;
    margin-bottom: $space-xx-small;
  }
}
</style>

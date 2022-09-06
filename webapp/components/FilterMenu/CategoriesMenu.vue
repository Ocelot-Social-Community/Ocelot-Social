<template>
  <dropdown ref="menu" placement="top-start" :offset="8" class="filter-menu">
    <base-button
      slot="default"
      :filled="filterActive"
      :ghost="!filterActive"
      slot-scope="{ toggleMenu }"
      @click.prevent="toggleMenu()"
    >
      <ds-text uppercase>{{ $t('admin.categories.name') }}</ds-text>
    </base-button>
    <template slot="popover">
      <div class="filter-menu-options">
        <h2 class="title">{{ $t('filter-menu.filter-by') }}</h2>
        <categories-filter v-if="categoriesActive" />
      </div>
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import { mapGetters } from 'vuex'
import CategoriesFilter from './CategoriesFilter'

export default {
  name: 'CategoriesMenu',
  components: {
    Dropdown,
    CategoriesFilter,
  },
  props: {
    placement: { type: String },
    offset: { type: [String, Number] },
  },
  data() {
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
    }
  },
  computed: {
    ...mapGetters({
      filterActive: 'posts/isActive',
    }),
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

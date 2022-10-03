<template>
  <dropdown ref="category-menu" placement="top-start" :offset="8" class="category-menu">
    <a href="#" slot="default" slot-scope="{ toggleMenu }" @click.prevent="toggleMenu()">
      <ds-text bold size="large">{{ $t('admin.categories.name') }}</ds-text>
    </a>
    <template slot="popover">
      <div class="category-menu-options">
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
      // TODO: implement visibility of active filter later on
      filterActive: 'posts/isActive',
    }),
  },
}
</script>

<style lang="scss">
.category-menu-options {
  max-width: $size-max-width-filter-menu;
  padding: $space-small $space-x-small;

  > .title {
    font-size: $font-size-large;
  }
}
</style>

<template>
  <dropdown ref="menu" placement="top-start" :offset="8" class="filter-menu">
    <base-button
      slot="default"
      icon="filter"
      :filled="filterActive"
      :ghost="!filterActive"
      slot-scope="{ toggleMenu }"
      @click.prevent="toggleMenu()"
    >
      <base-icon class="dropdown-arrow" name="angle-down" />
    </base-button>
    <template #popover">
      <filter-menu-component />
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import { mapGetters } from 'vuex'
import FilterMenuComponent from './FilterMenuComponent'

export default {
  components: {
    Dropdown,
    FilterMenuComponent,
  },
  props: {
    placement: { type: String },
    offset: { type: [String, Number] },
  },
  computed: {
    ...mapGetters({
      filterActive: 'posts/isActive',
    }),
  },
}
</script>

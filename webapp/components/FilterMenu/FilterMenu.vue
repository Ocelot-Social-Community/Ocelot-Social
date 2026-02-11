<template>
  <dropdown ref="menu" placement="top-start" :offset="8" class="filter-menu">
    <os-button
      slot="default"
      variant="primary"
      :appearance="filterActive ? 'filled' : 'ghost'"
      slot-scope="{ toggleMenu }"
      @click.prevent="toggleMenu()"
    >
      <template #icon>
        <base-icon name="filter" />
      </template>
      <base-icon class="dropdown-arrow" name="angle-down" />
    </os-button>
    <template #popover>
      <filter-menu-component />
    </template>
  </dropdown>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import Dropdown from '~/components/Dropdown'
import { mapGetters } from 'vuex'
import FilterMenuComponent from './FilterMenuComponent'

export default {
  components: {
    Dropdown,
    FilterMenuComponent,
    OsButton,
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

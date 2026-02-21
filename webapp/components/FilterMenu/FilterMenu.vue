<template>
  <dropdown ref="menu" placement="top-start" :offset="8" class="filter-menu">
    <template #default="{ toggleMenu }">
      <os-button
        variant="primary"
        :appearance="filterActive ? 'filled' : 'ghost'"
        circle
        :aria-label="$t('common.filter')"
        @click.prevent="toggleMenu()"
      >
        <template #icon>
          <os-icon :icon="icons.filter" />
        </template>
      </os-button>
    </template>
    <template #popover>
      <filter-menu-component />
    </template>
  </dropdown>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'
import { mapGetters } from 'vuex'
import FilterMenuComponent from './FilterMenuComponent'

export default {
  components: {
    Dropdown,
    FilterMenuComponent,
    OsButton,
    OsIcon,
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
  created() {
    this.icons = iconRegistry
  },
}
</script>

<template>
  <dropdown ref="menu" placement="top-start" :offset="8" class="filter-menu">
    <template #default="{ toggleMenu }">
      <os-button
        variant="primary"
        :appearance="filterActive ? 'filled' : 'ghost'"
        :aria-label="$t('common.filter')"
        @click.prevent="toggleMenu()"
      >
        <template #icon>
          <base-icon name="filter" />
        </template>
        <os-icon class="dropdown-arrow" :icon="icons.angleDown" />
      </os-button>
    </template>
    <template #popover>
      <filter-menu-component />
    </template>
  </dropdown>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
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
  setup() {
    return { icons: ocelotIcons }
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

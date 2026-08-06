<template>
  <dropdown offset="8">
    <template #default="{ toggleMenu }">
      <a
        :v-model="selected"
        name="dropdown"
        class="dropdown-filter"
        href="#"
        @click.prevent="toggleMenu()"
      >
        <os-icon :icon="icons.filter" />
        <label class="label" for="dropdown">{{ selected }}</label>
        <os-icon class="dropdown-arrow" :icon="icons.angleDown" />
      </a>
    </template>
    <template #popover="{ toggleMenu }">
      <os-menu dropdown class="dropdown-menu-popover" :routes="filterOptions">
        <template #menuitem="item">
          <os-menu-item
            class="dropdown-menu-item"
            :route="item.route"
            :parents="item.parents"
            @click.stop.prevent="filter(item.route, toggleMenu)"
          >
            {{ item.route.label }}
          </os-menu-item>
        </template>
      </os-menu>
    </template>
  </dropdown>
</template>
<script>
import { OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    Dropdown,
    OsIcon,
    OsMenu,
    OsMenuItem,
  },
  setup() {
    return { icons: iconRegistry }
  },
  props: {
    selected: { type: String, default: '' },
    filterOptions: { type: Array, default: () => [] },
  },
  methods: {
    filter(option, toggleMenu) {
      this.$emit('filter', option)
      toggleMenu()
    },
  },
}
</script>
<style>
.dropdown-filter {
  user-select: none;
  display: flex;
  align-items: center;
  height: 100%;
  padding: var(--space-xx-small);
  color: var(--text-color-soft);

  > .label {
    margin: 0 var(--space-xx-small);
  }
}

.dropdown-menu {
  user-select: none;
  display: flex;
  align-items: center;
  height: 100%;
  padding: var(--space-xx-small);
  color: var(--text-color-soft);
}

.dropdown-menu-popover {
  a {
    padding: var(--space-x-small) var(--space-small);
    padding-right: var(--space-base);
  }
}
</style>

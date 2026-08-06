<template>
  <os-badge shape="square" class="category-tag" :class="filterActive ? 'filterActive' : ''">
    <os-icon :icon="resolvedIcon" />
    {{ name }}
  </os-badge>
</template>

<script>
import { OsBadge, OsIcon } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'

export default {
  name: 'HcCategory',
  components: { OsBadge, OsIcon },
  props: {
    icon: { type: String, required: true },
    name: { type: String, default: '' },
    filterActive: { type: Boolean, default: false, required: false },
  },
  computed: {
    resolvedIcon() {
      return resolveIcon(this.icon)
    },
  },
}
</script>

<style>
.category-tag {
  &.language {
    float: right;
  }

  > .os-icon {
    font-size: var(--font-size-base);
  }
}
.filterActive {
  color: var(--color-primary-inverse);
  background-color: var(--color-primary-highlight);
}
</style>

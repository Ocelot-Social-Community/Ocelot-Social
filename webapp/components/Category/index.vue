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

<style lang="scss">
.category-tag {
  &.language {
    float: right;
  }

  > .os-icon {
    font-size: $font-size-base;
  }
}
.filterActive {
  color: $color-primary-inverse;
  background-color: $color-primary-active;
}
</style>

<template>
  <ds-tag class="category-tag" :class="filterActive ? 'filterActive' : ''">
    <os-icon :icon="resolvedIcon" />
    {{ name }}
  </ds-tag>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'

export default {
  name: 'HcCategory',
  components: { OsIcon },
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
  display: inline-flex;
  align-items: center;
  &.language {
    float: right;
  }

  > .os-icon {
    margin-right: $space-xx-small;
    font-size: $font-size-base;
  }
}
.filterActive {
  color: $color-primary-inverse;
  background-color: $color-primary-active;
}
</style>

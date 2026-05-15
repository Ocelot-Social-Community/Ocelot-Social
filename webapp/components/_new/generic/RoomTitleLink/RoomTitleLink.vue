<template>
  <component
    :is="to ? 'nuxt-link' : 'span'"
    :to="to"
    :aria-label="ariaLabel"
    class="room-title-link"
    @click.native="$emit('click', $event)"
  >
    <os-icon v-if="showGroupIcon" :icon="icons.group" class="room-title-link__icon" />
    <span class="room-title-link__text">{{ name }}</span>
  </component>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'RoomTitleLink',
  components: { OsIcon },
  props: {
    name: { type: String, default: '' },
    // Pass a route object for an in-app link or leave null for a plain span.
    to: { type: [Object, String], default: null },
    showGroupIcon: { type: Boolean, default: false },
    ariaLabel: { type: String, default: null },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style lang="scss" scoped>
.room-title-link {
  color: inherit;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;

  &:hover,
  &:focus-visible {
    color: $color-primary;
  }
}

.room-title-link__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.room-title-link__icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>

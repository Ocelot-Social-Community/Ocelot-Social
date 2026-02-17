<template>
  <div :class="`location-info size-${size}`">
    <div class="location">
      <os-icon :icon="icons.mapMarker" />
      {{ locationData.name }}
    </div>
    <div v-if="locationData.distanceToMe !== null && !isOwner" class="distance">
      {{ $t('location.distance', { distance: locationData.distanceToMe }) }}
    </div>
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'LocationInfo',
  components: { OsIcon },
  props: {
    locationData: { type: Object, default: null },
    size: {
      type: String,
      default: 'base',
      validator: (value) => {
        return value.match(/(small|base)/)
      },
    },
    isOwner: {
      type: Boolean,
      required: true,
    },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style scoped>
.location-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .location {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.size-base {
  > .distance {
    margin-top: 8px;
  }
}

.size-small {
  font-size: 0.8rem;
  color: #70677e;
  margin-bottom: 12px;

  > .distance {
    margin-top: 2px;
  }
}
</style>

<template>
  <div :class="`location-info size-${size}`">
    <div class="location">
      <base-icon name="map-marker" />
      {{ locationData.name }}
    </div>
    <div v-if="locationData.distanceToMe !== null" class="distance">
      {{ $t('location.distance', { distance: locationData.distanceToMe }) }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocationInfo',
  props: {
    locationData: { type: Object, default: null },
    size: {
      type: String,
      default: 'base',
      validator: (value) => {
        return value.match(/(small|base)/)
      },
    },
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

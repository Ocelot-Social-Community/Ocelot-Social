<template>
  <div class="location-info">
    <div class="location">
      <base-icon name="map-marker" />
      {{ locationData.name }}
    </div>
    <div v-if="distance" class="distance">{{ distance }}</div>
  </div>
</template>

<script>
export default {
  name: 'LocationInfo',
  props: {
    locationData: { type: Object, default: null },
  },
  computed: {
    distance() {
      return !this.locationData.distanceToMe
        ? null
        : this.$t('location.distance', { distance: this.locationData.distanceToMe })
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

  .distance {
    margin-top: 8px;
  }
}
</style>

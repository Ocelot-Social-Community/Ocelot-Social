<template>
  <div class="location-info">
    <div class="location">
      <base-icon name="map-marker" />
      {{ location.name }}
    </div>
    <div v-if="distance" class="distance">{{ distance }}</div>
  </div>
</template>

<script>
export default {
  name: 'LocationInfo',
  props: {
    location: { type: Object, default: null },
  },
  computed: {
    distance() {
      return !this.location.distance
        ? null
        : this.$t('location.distance', { distance: this.location.distance })
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

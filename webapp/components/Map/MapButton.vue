<template>
  <div>
    <nuxt-link to="/map">
      <base-button class="map-button" circle ghost>
        <base-icon name="globe-detailed" size="large" />
      </base-button>
    </nuxt-link>
  </div>
</template>

<script>
export default {}
</script>

<style lang="scss">
.map-button {
  margin-left: 4px;
  margin-right: 4px;
}
</style>

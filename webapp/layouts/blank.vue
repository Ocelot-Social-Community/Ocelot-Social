<template>
  <div class="layout-blank">
    <ds-container>
      <div>
        <nuxt />
      </div>
    </ds-container>
    <div id="overlay" />
  </div>
</template>

<script>
import seo from '~/mixins/seo'
export default {
  mixins: [seo],
}
</script>

<style lang="scss">
.layout-blank > .ds-container > div {
  padding: 5rem 2rem;
}
@media only screen and (max-width: 500px) {
  .layout-blank > .ds-container > div {
    padding: 3rem 0;
  }
}
</style>

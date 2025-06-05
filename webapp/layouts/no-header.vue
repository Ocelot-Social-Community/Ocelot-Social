<template>
  <div class="layout-blank">
    <ds-container>
      <div>
        <nuxt />
      </div>
    </ds-container>
    <page-footer />
    <div id="overlay" />
  </div>
</template>

<script>
import seo from '~/mixins/seo'
import PageFooter from '~/components/PageFooter/PageFooter'

export default {
  components: {
    PageFooter,
  },
  mixins: [seo],
  methods: {
    redirectToRoot() {
      this.$router.replace('/')
    },
  },
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

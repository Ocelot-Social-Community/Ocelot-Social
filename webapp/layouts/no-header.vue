<template>
  <div class="layout-blank">
    <div class="layout-content">
      <ds-container>
        <div>
          <nuxt />
        </div>
      </ds-container>
    </div>
    <page-footer :is-sticky="false" />
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
.layout-blank {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-content {
  flex: 1;
}

.layout-blank > .layout-content > .ds-container > div {
  padding: 5rem 2rem;
}

@media only screen and (max-width: 500px) {
  .layout-blank > .layout-content > .ds-container > div {
    padding: 3rem 0;
  }
}
</style>

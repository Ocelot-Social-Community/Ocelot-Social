<template>
  <div class="layout-default">
    <div class="main-navigation">
      <header-menu :showMobileMenu="showMobileMenu" />
    </div>
    <ds-container>
      <div class="main-container">
        <nuxt />
      </div>
    </ds-container>
    <page-footer v-if="!showMobileMenu" />
    <div id="overlay" />
    <client-only>
      <modal />
    </client-only>
  </div>
</template>

<script>
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import seo from '~/mixins/seo'
import Modal from '~/components/Modal'
import PageFooter from '~/components/PageFooter/PageFooter'

export default {
  components: {
    HeaderMenu,
    Modal,
    PageFooter,
  },
  mixins: [seo],
  data() {
    return {
      windowWidth: null,
      maxMobileWidth: 811,
    }
  },
  computed: {
    showMobileMenu() {
      if (!this.windowWidth) return false
      return this.windowWidth <= this.maxMobileWidth
    },
  },
  mounted() {
    this.windowWidth = window.innerWidth
    window.addEventListener('resize', () => {
      this.windowWidth = window.innerWidth
    })
  },
}
</script>
<style lang="scss">
.main-navigation {
  background-color: $color-header-background;
}
.main-container {
  padding-top: 6rem;
  padding-bottom: 5rem;
}
</style>

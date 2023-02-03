<template>
  <div class="layout-default">
    <div class="main-navigation">
      <header-menu :showMobileMenu="isMobile" />
    </div>
    <ds-container>
      <div class="main-container">
        <nuxt :showMobileMenu="showMobileMenu" />
      </div>
    </ds-container>
    <page-footer v-if="!isMobile" />
    <div id="overlay" />
    <client-only>
      <modal />
    </client-only>
  </div>
</template>

<script>
import seo from '~/mixins/seo'
import mobile from '~/mixins/mobile'
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import Modal from '~/components/Modal'
import PageFooter from '~/components/PageFooter/PageFooter'

export default {
  components: {
    HeaderMenu,
    Modal,
    PageFooter,
  },
  mixins: [seo, mobile()],
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

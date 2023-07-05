<template>
  <div class="layout-default">
    <div class="main-navigation">
      <header-menu :showMobileMenu="isMobile" />
    </div>
    <ds-container>
      <div class="main-container">
        <nuxt />
      </div>
    </ds-container>
    <page-footer v-if="!isMobile" />
    <div id="overlay" />
    <client-only>
      <modal />
    </client-only>
    <client-only>
      <div v-if="true" class="chat-modul" ><chat-modul :singleRoom="true"/></div>
    </client-only>
  </div>
</template>

<script>
import seo from '~/mixins/seo'
import mobile from '~/mixins/mobile'
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import Modal from '~/components/Modal'
import PageFooter from '~/components/PageFooter/PageFooter'
import ChatModul from '~/components/Chat/Chat.vue'

export default {
  components: {
    HeaderMenu,
    Modal,
    PageFooter,
    ChatModul,
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

.chat-modul {
  background-color: red;
  height: 594px;
  width: 355px;
  position: absolute;
  bottom: 45px;
  right: 0;
  z-index: 10000;
}
</style>

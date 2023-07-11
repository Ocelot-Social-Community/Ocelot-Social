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
    <div v-if="$store.getters['chat/showChat'].showChat" class="chat-modul">
      <ds-text align="right" class="close">
        RoomID: {{ $store.getters['chat/showChat'].roomID }}
        <ds-button @click="$store.commit('chat/SET_OPEN_CHAT', { showChat: false, roomID: null })">
          x
        </ds-button>
      </ds-text>
      <chat-module :singleRoomId="$store.getters['chat/showChat'].roomID" />
    </div>
    >
  </div>
</template>
<script>
import seo from '~/mixins/seo'
import mobile from '~/mixins/mobile'
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import Modal from '~/components/Modal'
import PageFooter from '~/components/PageFooter/PageFooter'
import ChatModule from '~/components/Chat/Chat.vue'

export default {
  components: {
    HeaderMenu,
    Modal,
    PageFooter,
    ChatModule,
  },
  mixins: [seo, mobile()],
  beforeCreate() {
    this.$store.commit('chat/SET_OPEN_CHAT', { showChat: false, roomID: null })
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

.chat-modul {
  background-color: rgb(233, 228, 228);
  height: 667px;
  width: 355px;
  position: fixed;
  bottom: 45px;
  right: 0;
  z-index: 10000;
  .close {
    padding: 10px;
    color: blue;
    cursor: pointer;
  }
}
</style>

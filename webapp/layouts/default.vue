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
    <div v-if="getShowChat.showChat" class="chat-modul">
      <chat singleRoom :roomId="getShowChat.roomID" @close-single-room="closeSingleRoom" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import seo from '~/mixins/seo'
import mobile from '~/mixins/mobile'
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import Modal from '~/components/Modal'
import PageFooter from '~/components/PageFooter/PageFooter'
import Chat from '~/components/Chat/Chat.vue'

export default {
  components: {
    HeaderMenu,
    Modal,
    PageFooter,
    Chat,
  },
  mixins: [seo, mobile()],
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
    }),
  },
  methods: {
    ...mapMutations({
      showChat: 'chat/SET_OPEN_CHAT',
    }),
    closeSingleRoom() {
      this.showChat({ showChat: false, roomID: null })
    },
  },
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

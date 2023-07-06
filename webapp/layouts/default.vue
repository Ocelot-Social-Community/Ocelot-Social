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
      
        <div v-if="$store.getters['chat-modul/showChatModul'].showChatModul" class="chat-modul" >
         
         <ds-text align="right" class="close">
           RoomID: {{ $store.getters['chat-modul/showChatModul'].roomID }}
          <ds-button  @click="$store.commit('chat-modul/SET_OPEN_CHAT_MODUL', { showChatModul: false , roomID: 'u0' })">x</ds-button>
         </ds-text>
         
         <chat-modul :singleRoom="true"/>
       </div>
 
     
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

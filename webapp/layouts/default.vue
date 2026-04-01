<template>
  <div class="layout-default">
    <div class="main-navigation">
      <header-menu />
    </div>
    <div class="ds-container ds-container-x-large">
      <div class="main-container">
        <nuxt />
      </div>
    </div>
    <page-footer class="desktop-footer" />
    <div id="overlay" />
    <div v-if="getShowChat.showChat && !isMobile" class="chat-modul">
      <client-only>
        <chat
          singleRoom
          :userId="getShowChat.chatUserId"
          :groupId="getShowChat.groupId"
          @close-single-room="closeSingleRoom"
        />
      </client-only>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import seo from '~/mixins/seo'
import mobile from '~/mixins/mobile'
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import PageFooter from '~/components/PageFooter/PageFooter'
import Chat from '~/components/Chat/Chat.vue'

export default {
  components: {
    HeaderMenu,
    PageFooter,
    Chat,
  },
  mixins: [seo, mobile()],
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
    }),
  },
  watch: {
    'getShowChat.showChat'(open) {
      if (open && this.isMobile) {
        const { chatUserId, groupId } = this.getShowChat
        const query = {}
        if (chatUserId) query.userId = chatUserId
        if (groupId) query.groupId = groupId
        this.showChat({ showChat: false, chatUserId: null, groupId: null })
        if (this.$route.path === '/chat') {
          // Already on chat page — update query to trigger openFromQuery watcher
          this.$router.replace({ path: '/chat', query })
        } else {
          this.$router.push({ path: '/chat', query })
        }
      }
    },
  },
  methods: {
    ...mapMutations({
      showChat: 'chat/SET_OPEN_CHAT',
    }),
    closeSingleRoom() {
      this.showChat({ showChat: false, chatUserId: null, groupId: null })
    },
  },
  beforeCreate() {
    this.$store.commit('chat/SET_OPEN_CHAT', { showChat: false, chatUserId: null, groupId: null })
  },
}
</script>

<style lang="scss">
.main-navigation {
  background-color: $color-header-background;
}
.main-container {
  padding-top: 6rem;
  padding-bottom: 8rem;
}

@media (max-width: 810px) {
  .main-container {
    padding-top: 4rem;
    padding-bottom: $space-x-small;
  }

  .desktop-footer {
    display: none;
  }

  .ds-container {
    padding-left: $space-x-small !important;
    padding-right: $space-x-small !important;
  }
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

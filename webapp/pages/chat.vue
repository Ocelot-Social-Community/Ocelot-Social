<template>
  <div class="chat-page">
    <add-chat-room-by-user-search
      v-if="showSearch"
      ref="searchPanel"
      @add-chat-room="addChatRoom"
      @add-group-chat-room="addGroupChatRoom"
      @close-user-search="showSearch = false"
    />
    <client-only>
      <chat
        :userId="getShowChat.showChat ? getShowChat.chatUserId : null"
        ref="chat"
        @toggle-user-search="toggleSearch"
        :show-room="showRoom"
      />
    </client-only>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import AddChatRoomByUserSearch from '~/components/Chat/AddChatRoomByUserSearch'
import Chat from '../components/Chat/Chat.vue'

export default {
  components: {
    AddChatRoomByUserSearch,
    Chat,
  },
  data() {
    return {
      showSearch: false,
    }
  },
  mounted() {
    this.showChat({ showChat: false, chatUserId: null, groupId: null })
    this.openFromQuery()
  },
  watch: {
    '$route.query': 'openFromQuery',
  },
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
    }),
  },
  methods: {
    ...mapMutations({
      showChat: 'chat/SET_OPEN_CHAT',
    }),
    toggleSearch() {
      this.showSearch = !this.showSearch
      if (this.showSearch) {
        this.$nextTick(() => {
          this.$refs.searchPanel?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    },
    openFromQuery() {
      const { userId, groupId } = this.$route.query
      if (!userId && !groupId) return
      // Wait for client-only chat component to be available
      const tryOpen = () => {
        if (this.$refs.chat) {
          if (groupId) {
            this.$refs.chat.newGroupRoom(groupId)
          } else if (userId) {
            this.$refs.chat.newRoom(userId)
          }
          // Clean query params from URL
          this.$router.replace({ path: '/chat', query: {} })
        } else {
          setTimeout(tryOpen, 100)
        }
      }
      tryOpen()
    },
    addChatRoom(user) {
      this.$refs.chat.newRoom(user)
    },
    addGroupChatRoom(groupId) {
      this.$refs.chat.newGroupRoom(groupId)
    },
    showRoom(roomId) {
      this.showChat({ showChat: true, chatUserId: roomId })
    },
  },
}
</script>

<style lang="scss">
.layout-default:has(.chat-page) .main-container {
  padding-bottom: 0 !important;
}

@media (max-width: 768px) {
  .layout-default:has(.chat-page) {
    > .ds-container {
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    .main-container {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
    .chat-page {
      padding-top: var(--header-height, 66px);
      height: 100dvh;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      > * {
        flex-shrink: 0;
      }

      > :last-child {
        flex: 1;
        min-height: 0;
      }
    }
  }
}
</style>

<template>
  <div>
    <ds-heading tag="h1">{{ $t('chat.page.headline') }}</ds-heading>
    <add-chat-room-by-user-search
      v-if="showUserSearch"
      @add-chat-room="addChatRoom"
      @close-user-search="showUserSearch = false"
    />
    <!-- Wolle :chatRooms="chatRooms" -->
    <ds-space margin-bottom="small" />
    <chat
      :roomId="getShowChat.showChat ? getShowChat.roomID : null"
      ref="chat"
      @toggle-user-search="showUserSearch = !showUserSearch"
      :show-room="showRoom"
    />
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
      showUserSearch: false,
      // excludeUsers: [] // Wolle
    }
  },
  mounted() {
    this.showChat({ showChat: false, roomID: null })
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
    addChatRoom(userID) {
      this.$refs.chat.newRoom(userID)
    },
    showRoom(roomId) {
      this.showChat({ showChat: true, roomID: roomId })
    }
  },
}
</script>

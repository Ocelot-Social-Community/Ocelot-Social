<template>
  <div>
    <add-chat-room-by-user-search
      v-if="showUserSearch"
      @add-chat-room="addChatRoom"
      @close-user-search="showUserSearch = false"
    />
    <client-only>
      <chat
        :roomId="this.$route.params.id"
        ref="chat"
        @toggle-user-search="showUserSearch = !showUserSearch"
        @room-selected="updateUrl"
      />
    </client-only>
  </div>
</template>

<script>
import AddChatRoomByUserSearch from '~/components/Chat/AddChatRoomByUserSearch'
import Chat from '~/components/Chat/Chat.vue'

export default {
  components: {
    AddChatRoomByUserSearch,
    Chat,
  },
  data() {
    return {
      showUserSearch: false,
    }
  },
  methods: {
    addChatRoom(userID) {
      this.$refs.chat.newRoom(userID)
    },
    updateUrl(roomId) {
      this.$router.push({ path: `/chat/${roomId}` })
    },
  },
}
</script>

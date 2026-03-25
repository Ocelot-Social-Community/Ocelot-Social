<template>
  <div>
    <add-chat-room-by-user-search
      v-if="showUserSearch"
      @add-chat-room="addChatRoom"
      @close-user-search="showUserSearch = false"
    />
    <add-chat-room-by-group-search
      v-if="showGroupSearch"
      @add-group-chat-room="addGroupChatRoom"
      @close-group-search="showGroupSearch = false"
    />
    <client-only>
      <chat
        :roomId="getShowChat.showChat ? getShowChat.roomID : null"
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
import AddChatRoomByGroupSearch from '~/components/Chat/AddChatRoomByGroupSearch'
import Chat from '../components/Chat/Chat.vue'

export default {
  components: {
    AddChatRoomByUserSearch,
    AddChatRoomByGroupSearch,
    Chat,
  },
  data() {
    return {
      showUserSearch: false,
      showGroupSearch: false,
      searchToggleState: 'user', // alternates between 'user' and 'group'
    }
  },
  mounted() {
    this.showChat({ showChat: false, roomID: null, groupId: null })
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
      // Close any open search first
      this.showUserSearch = false
      this.showGroupSearch = false
      // Toggle between user and group search
      if (this.searchToggleState === 'user') {
        this.showUserSearch = true
        this.searchToggleState = 'group'
      } else {
        this.showGroupSearch = true
        this.searchToggleState = 'user'
      }
    },
    addChatRoom(userID) {
      this.$refs.chat.newRoom(userID)
    },
    addGroupChatRoom(groupId) {
      this.$refs.chat.newGroupRoom(groupId)
    },
    showRoom(roomId) {
      this.showChat({ showChat: true, roomID: roomId })
    },
  },
}
</script>

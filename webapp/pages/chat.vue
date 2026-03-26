<template>
  <div>
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

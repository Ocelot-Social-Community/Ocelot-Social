<template>
  <div>
    <ds-heading tag="h1">{{ $t('chat.page.headline') }}</ds-heading>
    <add-chat-room-by-user-search
      v-if="showUserSearch"
      @load-chat-rooms="loadChatRooms"
      @close-user-search="showUserSearch = false"
    />
    <!-- Wolle :chatRooms="chatRooms" -->
    <ds-space margin-bottom="small" />
    <chat
      :roomId="getShowChat.showChat ? getShowChat.roomID : null"
      @open-close-user-search="showUserSearch = !showUserSearch"
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
      // chatRooms: [] // Wolle
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
    loadChatRooms(newChatRoomID) {
      console.log('loadChatRooms !!! newChatRoomID: ', newChatRoomID)
    },
  },
}
</script>

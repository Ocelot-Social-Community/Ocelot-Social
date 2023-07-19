<template>
  <div>
    <ds-heading tag="h1">{{ $t('chat.page.headline') }}</ds-heading>
    <chat :roomId="getShowChat.showChat ? getShowChat.roomID : null" />
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import Chat from '../components/Chat/Chat.vue'

export default {
  components: { Chat },
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
  },
}
</script>

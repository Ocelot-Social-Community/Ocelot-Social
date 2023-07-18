<template>
  <div>
    <ds-heading tag="h1">{{ $t('chat.page.headline') }}</ds-heading>
    <chat />
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import Chat from '../components/Chat/Chat.vue'

export default {
  components: { Chat },
  mounted() {
    this.showChat({ showChat: false, roomID: null })
  },
  methods: {
    ...mapMutations({
      showChat: 'chat/SET_OPEN_CHAT',
    }),
  },
}
</script>

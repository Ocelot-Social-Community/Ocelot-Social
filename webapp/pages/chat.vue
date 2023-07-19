<template>
  <div>
    <ds-heading tag="h1">{{ $t('chat.page.headline') }}</ds-heading>
    <add-group-member
      v-if="showUserSearch"
      :groupId="0"
      :groupMembers="[]"
      @loadGroupMembers="null"
    />
    <ds-space margin-bottom="small" />
    <chat :roomId="getShowChat.showChat ? getShowChat.roomID : null" @open-user-search="showUserSearch = !showUserSearch" />
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import AddGroupMember from '~/components/Group/AddGroupMember'
import Chat from '../components/Chat/Chat.vue'

export default {
  components: { AddGroupMember, Chat },
  data() {
    return {
      showUserSearch: false,
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
  },
}
</script>

<template>
  <div class="add-chat-room-by-user-search">
    <ds-flex class="headline">
      <h2 class="title">{{ $t('chat.addRoomHeadline') }}</h2>
      <base-button class="close-button" icon="close" circle size="small" @click="closeUserSearch" />
    </ds-flex>
    <ds-space margin-bottom="small" />
    <ds-space>
      <select-user-search :id="id" ref="selectUserSearch" @select-user="selectUser" />
    </ds-space>
  </div>
</template>

<script>
import SelectUserSearch from '~/components/generic/SelectUserSearch/SelectUserSearch'

export default {
  name: 'AddChatRoomByUserSearch',
  components: {
    SelectUserSearch,
  },
  props: {
    // chatRooms: {
    //   type: Array,
    //   default: [],
    // },
  },
  data() {
    return {
      id: 'search-user-to-add-to-group',
      user: {},
    }
  },
  methods: {
    selectUser(user) {
      this.user = user
      // if (this.groupMembers.find((member) => member.id === this.user.id)) {
      //   this.$toast.error(this.$t('group.errors.userAlreadyMember', { name: this.user.name }))
      //   this.$refs.selectUserSearch.clear()
      //   return
      // }
      this.$refs.selectUserSearch.clear()
      this.$emit('close-user-search')
      this.addChatRoom(this.user?.id)
    },
    async addChatRoom(userId) {
      this.$emit('add-chat-room', userId)
    },
    closeUserSearch() {
      this.$emit('close-user-search')
    },
  },
}
</script>

<style lang="scss">
.add-chat-room-by-user-search {
  background-color: white;
  padding: $space-base;
}
.ds-flex.headline {
  justify-content: space-between;
}
.ds-flex.headline .close-button {
  margin-top: -2px;
}
</style>

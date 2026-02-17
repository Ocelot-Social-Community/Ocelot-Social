<template>
  <div class="add-chat-room-by-user-search">
    <ds-flex class="headline">
      <h2 class="title">{{ $t('chat.addRoomHeadline') }}</h2>
      <os-button
        class="close-button"
        variant="primary"
        appearance="ghost"
        circle
        size="sm"
        :aria-label="$t('actions.close')"
        @click="closeUserSearch"
      >
        <template #icon>
          <os-icon :icon="icons.close" />
        </template>
      </os-button>
    </ds-flex>
    <ds-space margin-bottom="small" />
    <ds-space>
      <select-user-search :id="id" ref="selectUserSearch" @select-user="selectUser" />
    </ds-space>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import SelectUserSearch from '~/components/generic/SelectUserSearch/SelectUserSearch'

export default {
  name: 'AddChatRoomByUserSearch',
  components: {
    OsButton,
    OsIcon,
    SelectUserSearch,
  },
  props: {
    // chatRooms: {
    //   type: Array,
    //   default: [],
    // },
  },
  created() {
    this.icons = ocelotIcons
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

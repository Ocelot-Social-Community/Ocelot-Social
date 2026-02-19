<template>
  <div class="add-chat-room-by-user-search">
    <div class="ds-flex headline">
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
    </div>
    <div class="ds-mb-small"></div>
    <div class="ds-mb-large">
      <select-user-search :id="id" ref="selectUserSearch" @select-user="selectUser" />
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
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
  data() {
    return {
      id: 'search-user-to-add-to-group',
      user: {},
    }
  },
  created() {
    this.icons = iconRegistry
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

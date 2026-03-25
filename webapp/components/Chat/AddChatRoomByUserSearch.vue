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
        @click="closeSearch"
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
    <!-- My groups section -->
    <div v-if="myGroups.length" class="chat-search-groups">
      <h4 class="ds-heading ds-heading-h4 ds-mb-x-small">{{ $t('chat.addGroupRoomHeadline') }}</h4>
      <div class="group-list">
        <div
          v-for="group in myGroups"
          :key="group.id"
          class="group-list-item"
          @click="selectGroup(group)"
        >
          <profile-avatar :profile="group" size="small" />
          <div class="group-list-item-info">
            <span class="group-list-item-name">{{ group.name }}</span>
            <span class="group-list-item-slug">&{{ group.slug }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import SelectUserSearch from '~/components/generic/SelectUserSearch/SelectUserSearch'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import { groupQuery } from '~/graphql/groups'

export default {
  name: 'AddChatRoomByUserSearch',
  components: {
    OsButton,
    OsIcon,
    SelectUserSearch,
    ProfileAvatar,
  },
  data() {
    return {
      id: 'search-user-to-add-to-group',
      user: {},
      myGroups: [],
    }
  },
  created() {
    this.icons = iconRegistry
    this.fetchMyGroups()
  },
  methods: {
    async fetchMyGroups() {
      try {
        const {
          data: { Group },
        } = await this.$apollo.query({
          query: groupQuery(this.$i18n),
          variables: { isMember: true },
          fetchPolicy: 'network-only',
        })
        this.myGroups = Group.filter((g) => g.myRole && g.myRole !== 'pending')
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    selectUser(user) {
      this.user = user
      this.$refs.selectUserSearch.clear()
      this.$emit('add-chat-room', this.user?.id)
      this.$emit('close-user-search')
    },
    selectGroup(group) {
      this.$emit('add-group-chat-room', group.id)
      this.$emit('close-user-search')
    },
    closeSearch() {
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
.chat-search-groups {
  border-top: 1px solid $background-color-softer;
  padding-top: $space-small;
}
.group-list {
  max-height: 200px;
  overflow-y: auto;
}
.group-list-item {
  display: flex;
  align-items: center;
  padding: $space-x-small;
  cursor: pointer;
  border-radius: $border-radius-base;
  &:hover {
    background-color: $background-color-softer;
  }
}
.group-list-item-info {
  margin-left: $space-x-small;
  display: flex;
  flex-direction: column;
}
.group-list-item-name {
  font-weight: $font-weight-bold;
}
.group-list-item-slug {
  font-size: $font-size-small;
  color: $text-color-soft;
}
</style>

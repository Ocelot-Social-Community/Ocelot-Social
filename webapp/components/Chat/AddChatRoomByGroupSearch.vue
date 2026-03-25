<template>
  <div class="add-chat-room-by-group-search">
    <div class="ds-flex headline">
      <h2 class="title">{{ $t('chat.addGroupRoomHeadline') }}</h2>
      <os-button
        class="close-button"
        variant="primary"
        appearance="ghost"
        circle
        size="sm"
        :aria-label="$t('actions.close')"
        @click="closeGroupSearch"
      >
        <template #icon>
          <os-icon :icon="icons.close" />
        </template>
      </os-button>
    </div>
    <div class="ds-mb-small"></div>
    <div class="ds-mb-large">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="group-search-input"
        :placeholder="$t('chat.searchGroupPlaceholder')"
      />
      <div v-if="filteredGroups.length" class="group-search-results">
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          class="group-search-item"
          @click="selectGroup(group)"
        >
          <profile-avatar :profile="group" size="small" />
          <div class="group-search-item-info">
            <span class="group-search-item-name">{{ group.name }}</span>
            <span class="group-search-item-slug">&{{ group.slug }}</span>
          </div>
        </div>
      </div>
      <p v-else-if="searchQuery && !loading" class="ds-text ds-text-soft ds-text-size-small">
        {{ $t('chat.noGroupsFound') }}
      </p>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { groupQuery } from '~/graphql/groups'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

export default {
  name: 'AddChatRoomByGroupSearch',
  components: {
    OsButton,
    OsIcon,
    ProfileAvatar,
  },
  data() {
    return {
      searchQuery: '',
      groups: [],
      loading: false,
    }
  },
  computed: {
    filteredGroups() {
      if (!this.searchQuery) return this.groups
      const query = this.searchQuery.toLowerCase()
      return this.groups.filter(
        (g) => g.name.toLowerCase().includes(query) || g.slug.toLowerCase().includes(query),
      )
    },
  },
  created() {
    this.icons = iconRegistry
    this.fetchMyGroups()
  },
  methods: {
    async fetchMyGroups() {
      this.loading = true
      try {
        const {
          data: { Group },
        } = await this.$apollo.query({
          query: groupQuery(this.$i18n),
          variables: {
            isMember: true,
          },
          fetchPolicy: 'network-only',
        })
        this.groups = Group.filter((g) => g.myRole && g.myRole !== 'pending')
      } catch (error) {
        this.$toast.error(error.message)
      }
      this.loading = false
    },
    selectGroup(group) {
      this.$emit('add-group-chat-room', group.id)
      this.$emit('close-group-search')
    },
    closeGroupSearch() {
      this.$emit('close-group-search')
    },
  },
}
</script>

<style lang="scss">
.add-chat-room-by-group-search {
  background-color: white;
  padding: $space-base;
}
.ds-flex.headline {
  justify-content: space-between;
}
.ds-flex.headline .close-button {
  margin-top: -2px;
}
.group-search-input {
  width: 100%;
  padding: $space-x-small $space-small;
  border: 1px solid $text-color-softer;
  border-radius: $border-radius-base;
  font-size: $font-size-base;
  &:focus {
    outline: none;
    border-color: $color-primary;
  }
}
.group-search-results {
  margin-top: $space-x-small;
  max-height: 300px;
  overflow-y: auto;
}
.group-search-item {
  display: flex;
  align-items: center;
  padding: $space-x-small;
  cursor: pointer;
  border-radius: $border-radius-base;
  &:hover {
    background-color: $background-color-softer;
  }
}
.group-search-item-info {
  margin-left: $space-x-small;
  display: flex;
  flex-direction: column;
}
.group-search-item-name {
  font-weight: $font-weight-bold;
}
.group-search-item-slug {
  font-size: $font-size-small;
  color: $text-color-soft;
}
</style>

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
      <ocelot-select
        class="chat-search-combined"
        type="search"
        icon="search"
        label-prop="id"
        v-model="query"
        id="chat-search-combined"
        :icon-right="null"
        :options="combinedResults"
        :loading="searching"
        :filter="(item) => item"
        :no-options-available="$t('chat.searchPlaceholder')"
        :auto-reset-search="true"
        :placeholder="$t('chat.searchPlaceholder')"
        @focus.capture.native="onFocus"
        @input.native="handleInput"
        @keyup.delete.native="onDelete"
        @keyup.esc.native="clear"
        @blur.capture.native="onBlur"
        @input.exact="onSelect"
      >
        <template #option="{ option }">
          <div class="chat-search-result-item">
            <profile-avatar :profile="option" size="small" />
            <div class="chat-search-result-info">
              <span class="chat-search-result-name">{{ option.name }}</span>
              <span class="chat-search-result-detail">
                {{ option._type === 'group' ? `&${option.slug}` : `@${option.slug}` }}
              </span>
            </div>
            <os-badge size="sm" class="chat-search-result-badge">
              {{ option._type === 'group' ? $t('chat.searchBadgeGroup') : $t('chat.searchBadgeUser') }}
            </os-badge>
          </div>
        </template>
      </ocelot-select>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon, OsBadge } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { isEmpty } from 'lodash'
import { searchUsers } from '~/graphql/Search.js'
import { groupQuery } from '~/graphql/groups'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import OcelotSelect from '~/components/OcelotSelect/OcelotSelect.vue'

export default {
  name: 'AddChatRoomByUserSearch',
  components: {
    OsButton,
    OsIcon,
    OsBadge,
    ProfileAvatar,
    OcelotSelect,
  },
  data() {
    return {
      query: '',
      users: [],
      myGroups: [],
      searching: false,
    }
  },
  computed: {
    startSearch() {
      return this.query && this.query.length >= 3
    },
    filteredGroups() {
      if (!this.query || this.query.length < 1) return this.myGroups
      const q = this.query.toLowerCase()
      return this.myGroups.filter(
        (g) => g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q),
      )
    },
    combinedResults() {
      const groups = this.filteredGroups.map((g) => ({
        ...g,
        _type: 'group',
        id: `group-${g.id}`,
        _originalId: g.id,
      }))
      const users = this.users.map((u) => ({
        ...u,
        _type: 'user',
        id: `user-${u.id}`,
        _originalId: u.id,
      }))
      return [...groups, ...users]
    },
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
    onFocus() {},
    onBlur() {
      this.query = ''
    },
    handleInput(event) {
      this.query = event.target ? event.target.value.trim() : ''
    },
    onDelete(event) {
      const value = event.target ? event.target.value.trim() : ''
      if (isEmpty(value)) {
        this.clear()
      } else {
        this.handleInput(event)
      }
    },
    clear() {
      this.query = ''
      this.users = []
    },
    onSelect(item) {
      if (!item) return
      if (item._type === 'group') {
        this.$emit('add-group-chat-room', item._originalId)
      } else {
        this.$emit('add-chat-room', item._originalId)
      }
      this.$emit('close-user-search')
    },
    closeSearch() {
      this.$emit('close-user-search')
    },
  },
  apollo: {
    searchUsers: {
      query() {
        return searchUsers
      },
      variables() {
        return {
          query: this.query,
          firstUsers: 5,
          usersOffset: 0,
        }
      },
      skip() {
        return !this.startSearch
      },
      update({ searchUsers }) {
        this.users = searchUsers.users
      },
      fetchPolicy: 'cache-and-network',
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
.chat-search-result-item {
  display: flex;
  align-items: center;
  width: 100%;
}
.chat-search-result-info {
  margin-left: $space-x-small;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.chat-search-result-name {
  font-weight: $font-weight-bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-search-result-detail {
  font-size: $font-size-small;
  color: $text-color-soft;
}
.chat-search-result-badge {
  margin-left: auto;
  flex-shrink: 0;
  white-space: nowrap;
  // Tailwind @layer utilities have lower specificity than unlayered CSS,
  // so we need to explicitly set the badge styles here.
  font-size: 0.75rem;
  padding: 0.2em 0.8em;
  border-radius: 2em;
  line-height: 1.3;
}
</style>

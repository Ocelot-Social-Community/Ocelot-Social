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
        :value="selectedItem"
        id="chat-search-combined"
        :icon-right="null"
        :options="results"
        :loading="$apollo.queries.searchChatTargets.loading"
        :filter="(item) => item"
        :no-options-available="$t('chat.searchPlaceholder')"
        :auto-reset-search="true"
        :placeholder="$t('chat.searchPlaceholder')"
        @input.native="handleInput"
        @keyup.delete.native="onDelete"
        @keyup.esc.native="clear"
        @blur.capture.native="onBlur"
        @input="onSelect"
      >
        <template #option="{ option }">
          <div class="chat-search-result-item">
            <profile-avatar :profile="option" size="small" />
            <div class="chat-search-result-info">
              <span class="chat-search-result-name">{{ option.name }}</span>
              <span class="chat-search-result-detail">
                {{ option.__typename === 'Group' ? `&${option.slug}` : `@${option.slug}` }}
              </span>
            </div>
            <os-badge size="sm" class="chat-search-result-badge">
              {{
                option.__typename === 'Group'
                  ? $t('chat.searchBadgeGroup')
                  : $t('chat.searchBadgeUser')
              }}
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
import { searchChatTargets } from '~/graphql/Search.js'
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
      selectedItem: null,
      results: [],
      blurTimeout: null,
    }
  },
  computed: {
    startSearch() {
      return this.query && this.query.length >= 3
    },
  },
  beforeDestroy() {
    clearTimeout(this.blurTimeout)
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    onBlur() {
      clearTimeout(this.blurTimeout)
      this.blurTimeout = setTimeout(() => {
        this.query = ''
        this.results = []
      }, 200)
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
      this.results = []
    },
    onSelect(item) {
      if (!item || typeof item === 'string') return
      if (!item.__typename) return
      clearTimeout(this.blurTimeout)
      this.selectedItem = item
      if (item.__typename === 'Group') {
        this.$emit('add-group-chat-room', item.id)
      } else {
        this.$emit('add-chat-room', { id: item.id, name: item.name, slug: item.slug, avatar: item.avatar })
      }
      this.$nextTick(() => {
        this.$emit('close-user-search')
      })
    },
    closeSearch() {
      this.$emit('close-user-search')
    },
  },
  apollo: {
    searchChatTargets: {
      query() {
        return searchChatTargets
      },
      variables() {
        return {
          query: this.query,
          limit: 10,
        }
      },
      skip() {
        return !this.startSearch
      },
      update({ searchChatTargets }) {
        this.results = searchChatTargets.map((item) => ({
          ...item,
          // Normalize Group name field (groupName alias → name)
          name: item.name || item.groupName,
        }))
      },
      fetchPolicy: 'no-cache',
    },
  },
}
</script>

<style lang="scss">
.add-chat-room-by-user-search {
  background-color: white;
  padding: $space-base;
  scroll-margin-top: 7rem;
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

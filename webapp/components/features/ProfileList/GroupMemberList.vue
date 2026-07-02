<template>
  <os-card v-if="hasGroups || myProfile" class="group-member-list">
    <h5 class="title spacer-x-small">{{ $t('profile.groups.title', { name: userName }) }}</h5>

    <div class="group-scroll-container" ref="scrollContainer">
      <template v-if="hasGroups">
        <div v-for="type in groupTypes" :key="type">
          <template v-if="groupsByType[type] && groupsByType[type].length">
            <p class="type-label">{{ $t(`profile.groups.${type}`) }}</p>
            <ul class="group-list">
              <li v-for="group in groupsByType[type]" :key="group.id" class="group-item">
                <nuxt-link
                  class="group-item__link"
                  :to="{ name: 'groups-id-slug', params: { id: group.id, slug: group.slug } }"
                >
                  <profile-avatar :profile="group" size="small" class="group-item__avatar" />
                  <div class="group-item__info">
                    <span class="group-item__name">{{ group.name }}</span>
                    <span class="group-item__slug ds-text-soft">&amp;{{ group.slug }}</span>
                  </div>
                </nuxt-link>
                <button
                  v-if="myProfile"
                  class="group-item__visibility-btn"
                  :title="
                    group.showOnProfile
                      ? $t('group.contentMenu.hideFromProfile')
                      : $t('group.contentMenu.showOnProfile')
                  "
                  @click.prevent="toggleVisibility(group)"
                >
                  <os-icon :icon="group.showOnProfile ? icons.eye : icons.eyeSlash" />
                </button>
              </li>
            </ul>
          </template>
        </div>
      </template>

      <p v-else-if="!loadingGroups" class="nobody-message">
        {{ $t('profile.groups.nobody') }}
      </p>

      <div v-if="loadingMore || loadingGroups" class="loading-more">
        <os-spinner size="small" />
      </div>
    </div>
  </os-card>
</template>

<script>
import { OsCard, OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import {
  profileUserGroupsQuery,
  setGroupMembershipVisibilityMutation,
  groupMembershipVisibilityChangedSubscription,
} from '~/graphql/UserGroups'

const GROUP_TYPES = ['public', 'closed', 'hidden']
const PAGE_SIZE = 10

export default {
  name: 'GroupMemberList',
  components: {
    OsCard,
    OsIcon,
    OsSpinner,
    ProfileAvatar,
  },
  props: {
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    myProfile: { type: Boolean, default: false },
  },
  data() {
    return {
      groups: [],
      groupTypes: GROUP_TYPES,
      loadingGroups: false,
      loadingMore: false,
      allGroupsLoaded: false,
    }
  },
  created() {
    this.icons = iconRegistry
  },
  async mounted() {
    const observer = this.$apollo.subscribe({
      query: groupMembershipVisibilityChangedSubscription(),
      variables: { userId: this.userId },
    })
    this._groupVisibilitySubscription = observer.subscribe({
      next: () => {
        this.reloadGroups()
      },
      error: () => {},
    })

    await this.loadGroups(0)

    this.$nextTick(() => {
      if (this.$refs.scrollContainer) {
        this.$refs.scrollContainer.addEventListener('scroll', this.onScroll)
      }
    })
  },
  beforeDestroy() {
    if (this._groupVisibilitySubscription) {
      this._groupVisibilitySubscription.unsubscribe()
    }
    if (this.$refs.scrollContainer) {
      this.$refs.scrollContainer.removeEventListener('scroll', this.onScroll)
    }
  },
  computed: {
    hasGroups() {
      return this.groups && this.groups.length > 0
    },
    groupsByType() {
      return GROUP_TYPES.reduce((acc, type) => {
        acc[type] = (this.groups || []).filter((g) => g.groupType === type)
        return acc
      }, {})
    },
  },
  methods: {
    async loadGroups(offset) {
      if (offset === 0) {
        this.loadingGroups = true
        this.groups = []
        this.allGroupsLoaded = false
      } else {
        this.loadingMore = true
      }
      try {
        const { data } = await this.$apollo.query({
          query: profileUserGroupsQuery(),
          variables: { id: this.userId, first: PAGE_SIZE, offset },
          fetchPolicy: 'network-only',
        })
        const newGroups = data?.User?.[0]?.groups || []
        this.groups = [...this.groups, ...newGroups]
        if (newGroups.length < PAGE_SIZE) this.allGroupsLoaded = true
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.loadingGroups = false
        this.loadingMore = false
        // If container is not yet scrollable but there might be more, load more
        await this.$nextTick()
        const el = this.$refs.scrollContainer
        if (el && el.scrollHeight <= el.clientHeight && !this.allGroupsLoaded) {
          await this.loadGroups(this.groups.length)
        }
      }
    },
    async loadMore() {
      if (this.allGroupsLoaded || this.loadingMore || this.loadingGroups) return
      await this.loadGroups(this.groups.length)
    },
    onScroll() {
      const el = this.$refs.scrollContainer
      if (!el || this.allGroupsLoaded || this.loadingMore || this.loadingGroups) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        this.loadMore()
      }
    },
    reloadGroups() {
      this.loadGroups(0)
    },
    async toggleVisibility(group) {
      const newValue = !group.showOnProfile
      try {
        await this.$apollo.mutate({
          mutation: setGroupMembershipVisibilityMutation(),
          variables: { groupId: group.id, showOnProfile: newValue },
        })
        group.showOnProfile = newValue
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.group-member-list {
  display: flex;
  flex-direction: column;

  > .title {
    color: $text-color-soft;
    font-size: $font-size-base;
  }

  > :nth-child(n):not(:last-child) {
    margin-bottom: $space-x-small;
  }

  .group-scroll-container {
    max-height: 320px;
    overflow-y: auto;
  }

  .type-label {
    font-size: $font-size-small;
    color: $text-color-soft;
    margin-bottom: $space-xx-small;
  }

  .group-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .group-item {
    display: flex;
    align-items: center;
    padding: $space-xx-small;
    border-radius: $border-radius-base;

    &:hover {
      background-color: $background-color-primary-inverse;
    }

    &__link {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      color: $text-color-base;
      text-decoration: none;
      gap: $space-x-small;
    }

    &__avatar {
      flex-shrink: 0;
    }

    &__info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__name {
      font-size: $font-size-base;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__slug {
      font-size: $font-size-small;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__visibility-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: $text-color-soft;
      padding: $space-xx-small;
      border-radius: $border-radius-base;

      &:hover {
        color: $text-color-base;
      }
    }
  }

  .loading-more {
    display: flex;
    justify-content: center;
    padding: $space-x-small 0;
  }

  .nobody-message {
    text-align: center;
    color: $text-color-soft;
  }
}
</style>

<template>
  <infinite-scroll-list
    v-if="hasGroups || myProfile || loadingGroups || showFilter"
    :title="$t('profile.groups.title', { name: userName })"
    :count="allGroupsLoaded ? groups.length : null"
    :nobody-message="nobodyMessage"
    :empty="!hasGroups"
    :loading="loadingGroups || loadingMore"
    :has-more="!allGroupsLoaded"
    :show-filter="showFilter"
    :filter-placeholder="$t('common.filter')"
    @load-more="loadMore"
    @filter-change="onFilterChange"
    @scrolling-change="onScrollingChange"
  >
    <div v-for="(type, idx) in typesWithGroups" :key="type">
      <p class="type-label" :class="{ 'type-label--not-first': idx > 0 }">
        {{ $t(`profile.groups.${type}`) }}
      </p>
      <ul class="group-list">
        <li v-for="group in groupsByType[type]" :key="group.id" class="group-item">
          <group-avatar
            :group="group"
            :show-popover="popoverEnabled"
            :hover-delay="800"
            class="group-item__teaser"
          />
          <button
            v-if="myProfile"
            class="group-item__visibility-btn"
            :title="
              group.showOnProfile
                ? $t('group.contentMenu.hideFromProfile')
                : $t('group.contentMenu.showOnProfile')
            "
            :aria-label="
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
    </div>
  </infinite-scroll-list>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import GroupAvatar from '~/components/GroupAvatar/GroupAvatar'
import InfiniteScrollList from './InfiniteScrollList.vue'
import {
  profileUserGroupsQuery,
  setGroupMembershipVisibilityMutation,
  groupMembershipVisibilityChangedSubscription,
} from '~/graphql/UserGroups'

const GROUP_SECTIONS_BY_TYPE = ['public', 'closed', 'hidden']
const GROUP_SECTIONS_BY_MEMBERSHIP = ['shared', 'other']
const PAGE_SIZE = 25

export default {
  name: 'GroupMemberList',
  components: {
    OsIcon,
    GroupAvatar,
    InfiniteScrollList,
  },
  props: {
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    myProfile: { type: Boolean, default: false },
  },
  data() {
    return {
      groups: [],
      loadingGroups: true,
      loadingMore: false,
      allGroupsLoaded: false,
      activeFilter: '',
      showFilter: false,
      isScrolling: false,
      loadingCooldown: false,
    }
  },
  created() {
    this.icons = iconRegistry
  },
  watch: {
    isLoading(newVal, oldVal) {
      if (oldVal && !newVal) {
        clearTimeout(this._loadingCooldownTimer)
        this.loadingCooldown = true
        this._loadingCooldownTimer = setTimeout(() => {
          this.loadingCooldown = false
        }, 600)
      }
    },
  },
  async mounted() {
    const observer = this.$apollo.subscribe({
      query: groupMembershipVisibilityChangedSubscription(),
      variables: { userId: this.userId },
    })
    this._groupVisibilitySubscription = observer.subscribe({
      next: () => {
        if (this._skipNextSubscriptionReload) {
          this._skipNextSubscriptionReload = false
          return
        }
        this.reloadGroups()
      },
      error: (err) => this.$toast.error(err.message),
    })

    await this.loadGroups(0)
  },
  beforeDestroy() {
    if (this._groupVisibilitySubscription) {
      this._groupVisibilitySubscription.unsubscribe()
    }
    clearTimeout(this._loadingCooldownTimer)
  },
  computed: {
    hasGroups() {
      return this.groups && this.groups.length > 0
    },
    isLoading() {
      return this.loadingGroups || this.loadingMore
    },
    popoverEnabled() {
      return !this.isScrolling && !this.isLoading && !this.loadingCooldown
    },
    nobodyMessage() {
      if (this.activeFilter.length >= 3) return this.$t('profile.groups.noFilterResults')
      return this.$t('profile.groups.nobody')
    },
    groupsByType() {
      if (this.myProfile) {
        return GROUP_SECTIONS_BY_TYPE.reduce((acc, type) => {
          acc[type] = (this.groups || []).filter((g) => g.groupType === type)
          return acc
        }, {})
      }
      return {
        shared: (this.groups || []).filter((g) => g.myRole !== null && g.myRole !== 'pending'),
        other: (this.groups || []).filter((g) => g.myRole === null || g.myRole === 'pending'),
      }
    },
    typesWithGroups() {
      const types = this.myProfile ? GROUP_SECTIONS_BY_TYPE : GROUP_SECTIONS_BY_MEMBERSHIP
      return types.filter((type) => this.groupsByType[type]?.length > 0)
    },
  },
  methods: {
    async loadGroups(offset) {
      if (offset === 0) {
        this.loadingGroups = true
        this.allGroupsLoaded = false
      } else {
        this.loadingMore = true
      }
      try {
        const { data } = await this.$apollo.query({
          query: profileUserGroupsQuery(this.$i18n),
          variables: {
            id: this.userId,
            first: PAGE_SIZE,
            offset,
            nameFilter: this.activeFilter.length >= 3 ? this.activeFilter : '',
          },
          fetchPolicy: 'network-only',
        })
        const newGroups = data?.User?.[0]?.groups || []
        if (offset === 0) {
          this.groups = newGroups
        } else {
          this.groups = [...this.groups, ...newGroups]
        }
        if (newGroups.length < PAGE_SIZE) this.allGroupsLoaded = true
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.loadingGroups = false
        this.loadingMore = false
      }
    },
    async loadMore() {
      if (this.allGroupsLoaded || this.loadingMore || this.loadingGroups) return
      if (this.groups.length >= PAGE_SIZE) this.showFilter = true
      await this.loadGroups(this.groups.length)
    },
    reloadGroups() {
      this.loadGroups(0)
    },
    onFilterChange(val) {
      this.activeFilter = val
      this.loadGroups(0)
    },
    onScrollingChange(isScrolling) {
      this.isScrolling = isScrolling
    },
    async toggleVisibility(group) {
      const newValue = !group.showOnProfile
      group.showOnProfile = newValue
      this._skipNextSubscriptionReload = true
      try {
        await this.$apollo.mutate({
          mutation: setGroupMembershipVisibilityMutation(),
          variables: { groupId: group.id, showOnProfile: newValue },
        })
      } catch (error) {
        group.showOnProfile = !newValue
        this._skipNextSubscriptionReload = false
        this.$toast.error(error.message)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.type-label {
  font-size: $font-size-small;
  color: $text-color-soft;
  margin-bottom: $space-xx-small;

  &--not-first {
    margin-top: $space-small;
  }
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

  &__teaser {
    flex: 1;
    min-width: 0;
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
</style>

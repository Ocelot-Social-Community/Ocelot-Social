<template>
  <infinite-scroll-list
    v-if="hasGroups || myProfile"
    :title="$t('profile.groups.title', { name: userName })"
    :nobody-message="$t('profile.groups.nobody')"
    :empty="!hasGroups"
    :loading="loadingGroups || loadingMore"
    :has-more="!allGroupsLoaded"
    @load-more="loadMore"
  >
    <div v-for="(type, idx) in typesWithGroups" :key="type">
      <p class="type-label" :class="{ 'type-label--not-first': idx > 0 }">
        {{ $t(`profile.groups.${type}`) }}
      </p>
      <ul class="group-list">
        <li v-for="group in groupsByType[type]" :key="group.id" class="group-item">
          <group-teaser :group="group" class="group-item__teaser" />
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
import GroupTeaser from '~/components/GroupTeaser/GroupTeaser'
import InfiniteScrollList from './InfiniteScrollList.vue'
import {
  profileUserGroupsQuery,
  setGroupMembershipVisibilityMutation,
  groupMembershipVisibilityChangedSubscription,
} from '~/graphql/UserGroups'

const GROUP_SECTIONS_BY_TYPE = ['public', 'closed', 'hidden']
const GROUP_SECTIONS_BY_MEMBERSHIP = ['shared', 'other']
const PAGE_SIZE = 10

export default {
  name: 'GroupMemberList',
  components: {
    OsIcon,
    GroupTeaser,
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
      error: (err) => this.$toast.error(err.message),
    })

    await this.loadGroups(0)
  },
  beforeDestroy() {
    if (this._groupVisibilitySubscription) {
      this._groupVisibilitySubscription.unsubscribe()
    }
  },
  computed: {
    hasGroups() {
      return this.groups && this.groups.length > 0
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
        this.groups = []
        this.allGroupsLoaded = false
      } else {
        this.loadingMore = true
      }
      try {
        const { data } = await this.$apollo.query({
          query: profileUserGroupsQuery(this.$i18n),
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
      }
    },
    async loadMore() {
      if (this.allGroupsLoaded || this.loadingMore || this.loadingGroups) return
      await this.loadGroups(this.groups.length)
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

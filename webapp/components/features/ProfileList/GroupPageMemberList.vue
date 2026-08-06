<template>
  <infinite-scroll-list
    :title="$t('group.membersListTitle')"
    :count="membersCount || null"
    :nobody-message="nobodyMessage"
    :empty="!hasMembers || !allowedToSee"
    :loading="loadingInitial || loadingMore"
    :has-more="allowedToSee && !allLoaded"
    :show-filter="showFilter"
    :filter-placeholder="$t('common.filter')"
    :subtitle="subtitle"
    @load-more="onLoadMore"
    @filter-change="onFilterChange"
    @scrolling-change="onScrollingChange"
  >
    <div v-for="(section, idx) in sectionsWithMembers" :key="section.key">
      <p class="role-label" :class="{ 'role-label--not-first': idx > 0 }">
        {{ section.label }}
      </p>
      <ul class="member-list">
        <li v-for="member in section.members" :key="member.id" class="member-item">
          <user-avatar
            :user="member"
            :show-popover="popoverEnabled"
            :hover-delay="800"
            class="member-item__teaser"
          />
        </li>
      </ul>
    </div>
  </infinite-scroll-list>
</template>

<script>
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import InfiniteScrollList from './InfiniteScrollList.vue'
import { groupMembersQuery } from '~/graphql/groups'

const PAGE_SIZE = 25

const ROLE_SECTIONS = [
  { key: 'owner', roleMatch: (r) => r === 'owner' },
  { key: 'admin', roleMatch: (r) => r === 'admin' },
  { key: 'members', roleMatch: (r) => r === 'usual' || r === 'pending' },
]

export default {
  name: 'GroupPageMemberList',
  components: { InfiniteScrollList, UserAvatar },
  props: {
    groupId: { type: String, required: true },
    membersCount: { type: Number, default: null },
    subtitle: { type: String, default: null },
    allowedToSee: { type: Boolean, default: true },
  },
  data() {
    return {
      members: [],
      offset: 0,
      loadingInitial: true,
      loadingMore: false,
      allLoaded: false,
      showFilter: false,
      activeFilter: '',
      isScrolling: false,
      loadingCooldown: false,
    }
  },
  computed: {
    hasMembers() {
      return this.members.length > 0
    },
    nobodyMessage() {
      if (!this.allowedToSee) return this.$t('group.membersListTitleNotAllowedSeeingGroupMembers')
      return this.activeFilter.length >= 3 ? this.$t('group.membersListNoFilterResults') : null
    },
    isLoading() {
      return this.loadingInitial || this.loadingMore
    },
    popoverEnabled() {
      return !this.isScrolling && !this.isLoading && !this.loadingCooldown
    },
    membersByRole() {
      return ROLE_SECTIONS.reduce((acc, section) => {
        acc[section.key] = this.members.filter((m) => section.roleMatch(m.membershipRole))
        return acc
      }, {})
    },
    sectionsWithMembers() {
      return ROLE_SECTIONS.filter((section) => this.membersByRole[section.key].length > 0).map(
        (section) => ({
          key: section.key,
          label: this.$t(`group.roles.${section.key}`),
          members: this.membersByRole[section.key],
        }),
      )
    },
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
    if (this.allowedToSee) {
      await this.loadMembers(true)
    } else {
      this.loadingInitial = false
    }
  },
  beforeDestroy() {
    clearTimeout(this._loadingCooldownTimer)
  },
  methods: {
    async loadMembers(reset) {
      if (reset) {
        this.offset = 0
        this.allLoaded = false
        this.loadingInitial = true
      } else {
        this.loadingMore = true
      }
      try {
        const { data } = await this.$apollo.query({
          query: groupMembersQuery(),
          variables: {
            id: this.groupId,
            first: PAGE_SIZE,
            offset: this.offset,
            nameFilter: this.activeFilter.length >= 3 ? this.activeFilter : undefined,
          },
          fetchPolicy: 'network-only',
        })
        const newMembers = (data?.GroupMembers || []).map((d) => ({
          ...d.user,
          membershipRole: d.membership.role,
        }))
        this.members = reset ? newMembers : [...this.members, ...newMembers]
        this.offset = reset ? newMembers.length : this.offset + newMembers.length
        this.allLoaded = newMembers.length < PAGE_SIZE
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.loadingInitial = false
        this.loadingMore = false
      }
    },
    onLoadMore() {
      if (!this.allowedToSee || this.loadingMore || this.loadingInitial || this.allLoaded) return
      if (this.offset >= PAGE_SIZE) this.showFilter = true
      this.loadMembers(false)
    },
    onFilterChange(val) {
      if (!this.allowedToSee) return
      this.activeFilter = val
      this.loadMembers(true)
    },
    onScrollingChange(isScrolling) {
      this.isScrolling = isScrolling
    },
  },
}
</script>

<style scoped>
.role-label {
  font-size: var(--font-size-small);
  color: var(--text-color-soft);
  margin-bottom: var(--space-xx-small);
}

.role-label--not-first {
  margin-top: var(--space-x-small);
}

.member-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.member-item {
  padding: var(--space-xx-small);
  border-radius: var(--border-radius-base);

  &:hover {
    background-color: var(--background-color-primary-inverse);
  }
}

.member-item__teaser {
  width: 100%;
}
</style>

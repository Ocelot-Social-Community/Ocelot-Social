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
import { OWNER_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { groupRoleLabel } from '~/utils/groupRights'

const PAGE_SIZE = 25

// The sections that have a heading of their own, in the order they read. `admin` is matched by
// name rather than named as a constant: it is an ordinary, editable role now, so a group may
// relabel, rename or drop it — this list says "if a role by that name is here, head it", not
// "these are the roles".
const ROLE_SECTIONS = [
  { key: OWNER_GROUP_ROLE, roles: [OWNER_GROUP_ROLE] },
  { key: 'admin', roles: ['admin'] },
  { key: 'members', roles: [USUAL_GROUP_ROLE, PENDING_GROUP_ROLE] },
]

const SECTIONED_ROLES = new Set(ROLE_SECTIONS.flatMap((section) => section.roles))

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
    // Every role a group invented for itself and at least one member carries. Without these
    // sections such a member would be in no section at all and simply not be listed.
    customRoleSections() {
      const names = this.members.map((m) => m.membershipRole).filter(Boolean)
      return [...new Set(names)]
        .filter((name) => !SECTIONED_ROLES.has(name))
        .sort()
        .map((name) => ({ key: name, roles: [name] }))
    },
    sections() {
      return [...ROLE_SECTIONS, ...this.customRoleSections]
    },
    membersByRole() {
      return this.sections.reduce((acc, section) => {
        acc[section.key] = this.members.filter((m) => section.roles.includes(m.membershipRole))
        return acc
      }, {})
    },
    sectionsWithMembers() {
      return this.sections
        .filter((section) => this.membersByRole[section.key].length > 0)
        .map((section) => ({
          key: section.key,
          // A group's own label is not readable here (Group.roles needs group.role.manage), so
          // the heading is the translation of a known role name and otherwise the name itself.
          label: groupRoleLabel({ name: section.key }, (key) => this.$t(key)),
          members: this.membersByRole[section.key],
        }))
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

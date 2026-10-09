<template>
  <div>
    <add-group-member
      v-if="canInGroup('group.member.role.assign', group)"
      :groupId="group.id"
      :groupMembers="groupMembers"
      :groupRoles="assignableRoles"
      @loadGroupMembers="loadGroupMembers"
    />
    <div class="ds-mb-small"></div>
    <os-card>
      <group-member
        :groupId="group.id"
        :group="group"
        :groupMembers="groupMembers"
        :groupRoles="assignableRoles"
        @loadGroupMembers="loadGroupMembers"
      />
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import GroupMember from '~/components/Group/GroupMember'
import AddGroupMember from '~/components/Group/AddGroupMember'
import { groupMembersQuery } from '~/graphql/groups.js'
import { groupRightsQuery } from '~/graphql/groupRoles.js'
import groupRights from '~/mixins/groupRights'
import { NONE_GROUP_ROLE } from '~/constants/groups'

export default {
  mixins: [groupRights],
  components: {
    OsCard,
    GroupMember,
    AddGroupMember,
  },
  props: {
    group: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      roles: [],
    }
  },
  computed: {
    groupMembers() {
      return this.GroupMembers ? this.GroupMembers : []
    },
    // The roles a member can actually be given: everything the group defines except `none`,
    // which is the absence of a membership rather than something to assign.
    // Only while they are readable: ending an elevation takes the right away again, and the
    // definitions read under it must not outlive it.
    assignableRoles() {
      if (!this.canInGroup('group.role.manage', this.group)) return []
      return this.roles.filter((role) => role.name !== NONE_GROUP_ROLE)
    },
  },
  apollo: {
    groupRoles: {
      query() {
        return groupRightsQuery()
      },
      variables() {
        return { id: this.group.id }
      },
      // Reading the definitions needs group.role.manage. Skipped rather than left to fail, and
      // reactive: a network admin who elevates on this page gets the right with the refreshed
      // group, and only then does the query run — once it had failed, nothing asked again, and
      // the picker was stuck with the roles the members happened to carry (no `owner` in an
      // owner-less group, which is exactly where the admin came to appoint one).
      skip() {
        return !this.canInGroup('group.role.manage', this.group)
      },
      manual: true,
      result({ data, loading }) {
        if (loading || !data) return
        this.roles = data.Group?.[0]?.roles ?? []
      },
      error() {
        // Without the definitions the picker falls back to the roles the members already carry,
        // which is all this view needs to render them.
        this.roles = []
      },
    },
    GroupMembers: {
      query() {
        return groupMembersQuery()
      },
      variables() {
        return {
          id: this.group.id,
          first: 999999,
          includePending: true,
        }
      },
      error(error) {
        this.GroupMembers = []
        this.$toastBackendError(error)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
  methods: {
    loadGroupMembers() {
      this.$apollo.queries.GroupMembers.refetch()
    },
  },
}
</script>

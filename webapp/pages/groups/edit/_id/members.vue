<template>
  <div>
    <add-group-member
      :groupId="group.id"
      :groupMembers="groupMembers"
      :groupRoles="assignableRoles"
      @loadGroupMembers="loadGroupMembers"
    />
    <div class="ds-mb-small"></div>
    <os-card>
      <group-member
        :groupId="group.id"
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
import { NONE_GROUP_ROLE } from '~/constants/groups'

export default {
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
    assignableRoles() {
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
      manual: true,
      result({ data, loading }) {
        if (loading || !data) return
        this.roles = data.Group?.[0]?.roles ?? []
      },
      error() {
        // Reading the definitions needs group.role.manage; without it the picker falls back to
        // the roles the members already carry, which is all this view needs to render them.
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
        this.$toast.error(error.message)
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

<template>
  <div>
    <add-group-member
      :groupId="group.id"
      :groupMembers="groupMembers"
      @loadGroupMembers="loadGroupMembers"
    />
    <div class="ds-mb-small"></div>
    <os-card>
      <group-member
        :groupId="group.id"
        :groupMembers="groupMembers"
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
  computed: {
    groupMembers() {
      return this.GroupMembers ? this.GroupMembers : []
    },
  },
  apollo: {
    GroupMembers: {
      query() {
        return groupMembersQuery()
      },
      variables() {
        return {
          id: this.group.id,
          first: 999999,
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

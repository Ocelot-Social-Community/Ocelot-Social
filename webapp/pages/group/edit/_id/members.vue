<template>
  <div>
    <base-card>
      <ds-heading tag="h3">{{ $t('group.members') }}</ds-heading>
      <ds-space margin="large" />
      <group-member
        :groupId="group.id"
        :groupMembers="groupMembers"
        @loadGroupMembers="loadGroupMembers"
      />
    </base-card>
  </div>
</template>

<script>
import GroupMember from '~/components/Group/GroupMember'
import { groupMembersQuery } from '~/graphql/groups.js'

export default {
  components: {
    GroupMember,
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

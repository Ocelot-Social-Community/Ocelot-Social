<template>
  <div>
    <group-member :responseGroupMembersQuery="responseGroupMembersQuery" :groupId="group.id" />
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
      required: false,
      default: () => {},
    },
  },
  data() {
    return {
      responseGroupMembersQuery: [],
    }
  },
  methods: {
    async groupMembersQueryList() {
      try {
        const response = await this.$apollo.query({
          query: groupMembersQuery,
          variables: { id: this.group.id },
        })
        this.responseGroupMembersQuery = response.data.GroupMembers
      } catch (err) {
        this.$toast.error(err.message)
      } finally {
        this.pending = false
      }
    },
  },
  created() {
    this.groupMembersQueryList()
  },
}
</script>

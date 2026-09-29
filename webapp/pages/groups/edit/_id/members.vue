<template>
  <div>
    <div
      class="add-group-member-wrap"
      :class="{ 'is-read-only': group.myRole !== 'owner' }"
      :aria-disabled="group.myRole !== 'owner' ? true : undefined"
      v-tooltip="group.myRole !== 'owner' ? { content: $t('permissions.deniedHint') } : undefined"
    >
      <add-group-member
        :groupId="group.id"
        :groupMembers="groupMembers"
        @loadGroupMembers="loadGroupMembers"
      />
    </div>
    <div class="ds-mb-small"></div>
    <os-card>
      <group-member
        :groupId="group.id"
        :groupMembers="groupMembers"
        :myRole="group.myRole"
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

<style scoped>
/* Adding a brand-new member directly (bypassing pending) is an owner-only shortcut — see
   isAllowedToChangeGroupMemberRole. Visible but non-interactive for an admin, same pattern as
   GroupForm.vue's read-only settings fields. */
.add-group-member-wrap.is-read-only {
  pointer-events: none;
  opacity: 0.55;
}
</style>

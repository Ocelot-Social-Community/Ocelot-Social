<template>
  <div>
    <ds-space>
      <h3>{{ $t('group.members') }}</h3>
    </ds-space>
    <base-card>
      <ds-table :data="responseGroupMembersQuery" :fields="tableFields" condensed>
        <template slot="avatar">
          <ds-avatar online size="small" :name="responseGroupMembersQuery.name"></ds-avatar>
        </template>
        <template slot="myRoleInGroup" slot-scope="scope">
          <select
            v-if="scope.row.myRoleInGroup !== 'owner'"
            :options="['usual', 'admin']"
            :value="`${scope.row.myRoleInGroup}`"
            v-on:change="changeMemberRole(scope.row.id, $event)"
          >
            <option v-for="value in ['usual', 'admin']" :key="value">
              {{ value }}
            </option>
          </select>
        </template>
        <template slot="edit" slot-scope="scope">
          <ds-button
            v-if="scope.row.myRoleInGroup !== 'owner'"
            size="small"
            @click="openModal(scope.row)"
          >
            delete
          </ds-button>
        </template>
      </ds-table>
    </base-card>
    <ds-modal
      v-if="isOpen"
      v-model="isOpen"
      :title="`${$t('group.remove-member')} ?`"
      force
      extended
      :confirm-label="$t('group.remove-member')"
      @confirm="deleteMember(memberId)"
      :cancel-label="$t('actions.cancel')"
    />
  </div>
</template>
<script>
import { changeGroupMemberRoleMutation } from '~/graphql/groups.js'

export default {
  name: 'GroupMember',
  props: {
    groupId: {
      type: String,
      required: true,
    },
    responseGroupMembersQuery: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  data() {
    return {
      isOpen: false,
      memberId: null,
      tableFields: ['avatar', 'name', 'slug', 'myRoleInGroup', 'edit'],
    }
  },
  methods: {
    async changeMemberRole(id, event) {
      const newRole = event.target.value
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation,
          variables: { groupId: this.groupId, userId: id, roleInGroup: newRole },
        })
        this.$toast.success(this.$t('group.change-member-role', { role: newRole }))
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    openModal(row) {
      this.isOpen = true
      this.memberId = row.id
    },
    deleteMember(id) {
      alert('deleteMember: ' + id)
    },
  },
}
</script>

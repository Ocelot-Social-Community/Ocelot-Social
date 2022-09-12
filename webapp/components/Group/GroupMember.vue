<template>
  <div>
    <ds-space><h3>Members</h3></ds-space>
    <ds-table :data="responseGroupMembersQuery" :fields="tableFields" condensed>
      <template slot="avatar">
        <ds-avatar online size="small" :name="responseGroupMembersQuery.name"></ds-avatar>
      </template>
      <template slot="myRoleInGroup" slot-scope="scope">
        <ds-select
          v-if="scope.row.myRoleInGroup !== 'owner'"
          :options="['usual', 'admin']"
          v-model="scope.row.myRoleInGroup"
          :value="scope.row.myRoleInGroup"
          @input="changeMemberRole(scope.row.id, scope.row.myRoleInGroup)"
        ></ds-select>
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
    <ds-modal
      v-if="isOpen"
      v-model="isOpen"
      title="delete member ?"
      force
      extended
      confirm-label="delete member"
      @confirm="deleteMember(memberId)"
      cancel-label="Please not"
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
    async changeMemberRole(id, value) {
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation,
          variables: { groupId: this.groupId, userId: id, roleInGroup: value },
        })
        // this.$toast.success(this.$t('group.group-updated'))
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

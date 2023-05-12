<template>
  <div class="group-member">
    <h2 class="title">{{ $t('group.membersListTitle') }}</h2>
    <ds-space margin-bottom="small" />
    <ds-table :fields="tableFields" :data="groupMembers" condensed>
      <template #avatar="scope">
        <nuxt-link
          :to="{
            name: 'profile-id-slug',
            params: { id: scope.row.id, slug: scope.row.slug },
          }"
        >
          <profile-avatar :profile="scope.row" size="small" />
        </nuxt-link>
      </template>
      <template #name="scope">
        <nuxt-link
          :to="{
            name: 'profile-id-slug',
            params: { id: scope.row.id, slug: scope.row.slug },
          }"
        >
          <ds-text>
            <b>{{ scope.row.name | truncate(20) }}</b>
          </ds-text>
        </nuxt-link>
      </template>
      <template #slug="scope">
        <nuxt-link
          :to="{
            name: 'profile-id-slug',
            params: { id: scope.row.id, slug: scope.row.slug },
          }"
        >
          <ds-text>
            <b>{{ `@${scope.row.slug}` | truncate(20) }}</b>
          </ds-text>
        </nuxt-link>
      </template>
      <template #roleInGroup="scope">
        <select
          v-if="scope.row.myRoleInGroup !== 'owner'"
          :options="['pending', 'usual', 'admin', 'owner']"
          :value="`${scope.row.myRoleInGroup}`"
          @change="changeMemberRole(scope.row.id, $event)"
        >
          <option v-for="role in ['pending', 'usual', 'admin', 'owner']" :key="role" :value="role">
            {{ $t(`group.roles.${role}`) }}
          </option>
        </select>
        <ds-chip v-else color="primary">
          {{ $t(`group.roles.${scope.row.myRoleInGroup}`) }}
        </ds-chip>
      </template>
      <template #edit="scope">
        <base-button
          v-if="scope.row.myRoleInGroup !== 'owner'"
          size="small"
          primary
          @click="
            isOpen = true
            userId = scope.row.id
          "
        >
          {{ $t('group.removeMemberButton') }}
        </base-button>
      </template>
    </ds-table>
    <ds-modal
      v-if="isOpen"
      v-model="isOpen"
      :title="`${$t('group.removeMember')}`"
      force
      extended
      :confirm-label="$t('group.removeMember')"
      :cancel-label="$t('actions.cancel')"
      @confirm="removeUser()"
    />
  </div>
</template>
<script>
import { changeGroupMemberRoleMutation, removeUserFromGroupMutation } from '~/graphql/groups.js'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

export default {
  name: 'GroupMember',
  components: {
    ProfileAvatar,
  },
  props: {
    groupId: {
      type: String,
      required: true,
    },
    groupMembers: {
      type: Array,
      required: false,
    },
  },
  data() {
    return {
      id: 'search-user-to-add-to-group',
      query: '',
      searchProcess: null,
      user: {},
      isOpen: false,
      userId: null,
    }
  },
  computed: {
    tableFields() {
      return {
        avatar: {
          label: this.$t('group.membersAdministrationList.avatar'),
          align: 'left',
        },
        name: {
          label: this.$t('group.membersAdministrationList.name'),
          align: 'left',
        },
        slug: {
          label: this.$t('group.membersAdministrationList.slug'),
          align: 'left',
        },
        roleInGroup: {
          label: this.$t('group.membersAdministrationList.roleInGroup'),
          align: 'left',
        },
        edit: {
          label: '',
          align: 'left',
        },
      }
    },
  },
  methods: {
    async changeMemberRole(id, event) {
      const newRole = event.target.value
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: id, roleInGroup: newRole },
        })
        this.$toast.success(
          this.$t('group.changeMemberRole', { role: this.$t(`group.roles.${newRole}`) }),
        )
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    removeUser() {
      this.$apollo
        .mutate({
          mutation: removeUserFromGroupMutation(),
          variables: { groupId: this.groupId, userId: this.userId },
        })
        .then(({ data }) => {
          this.$emit('loadGroupMembers')
          this.$toast.success(
            this.$t('group.memberRemoved', { name: data.RemoveUserFromGroup.slug }),
          )
        })
        .catch((error) => {
          this.$toast.error(error.message)
        })
        .finally(() => {
          this.userId = null
        })
    },
  },
}
</script>

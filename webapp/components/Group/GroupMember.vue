<template>
  <div class="group-member">
    <h2 class="title">{{ $t('group.membersListTitle') }}</h2>
    <div class="ds-mb-small"></div>
    <div class="ds-table-wrap">
      <table class="ds-table ds-table-condensed ds-table-bordered">
        <thead>
          <tr>
            <th scope="col" class="ds-table-head-col">
              {{ $t('group.membersAdministrationList.avatar') }}
            </th>
            <th scope="col" class="ds-table-head-col">
              {{ $t('group.membersAdministrationList.name') }}
            </th>
            <th scope="col" class="ds-table-head-col">
              {{ $t('group.membersAdministrationList.slug') }}
            </th>
            <th scope="col" class="ds-table-head-col">
              {{ $t('group.membersAdministrationList.roleInGroup') }}
            </th>
            <th scope="col" class="ds-table-head-col" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in groupMembers" :key="member.user.id">
            <td class="ds-table-col">
              <nuxt-link
                :to="{
                  name: 'profile-id-slug',
                  params: { id: member.user.id, slug: member.user.slug },
                }"
              >
                <profile-avatar :profile="member.user" size="small" />
              </nuxt-link>
            </td>
            <td class="ds-table-col">
              <nuxt-link
                :to="{
                  name: 'profile-id-slug',
                  params: { id: member.user.id, slug: member.user.slug },
                }"
              >
                <p class="ds-text">
                  <b>{{ member.user.name | truncate(20) }}</b>
                </p>
              </nuxt-link>
            </td>
            <td class="ds-table-col">
              <nuxt-link
                :to="{
                  name: 'profile-id-slug',
                  params: { id: member.user.id, slug: member.user.slug },
                }"
              >
                <p class="ds-text">
                  <b>{{ `@${member.user.slug}` | truncate(20) }}</b>
                </p>
              </nuxt-link>
            </td>
            <td class="ds-table-col">
              <select
                v-if="member.membership.role !== 'owner'"
                :value="`${member.membership.role}`"
                @change="changeMemberRole(member.user.id, $event)"
              >
                <option v-for="role in groupRoles" :key="role" :value="role">
                  {{ $t(`group.roles.${role}`) }}
                </option>
              </select>
              <os-badge v-else variant="primary">
                {{ $t(`group.roles.${member.membership.role}`) }}
              </os-badge>
            </td>
            <td class="ds-table-col">
              <os-button
                v-if="member.membership.role !== 'owner'"
                appearance="outline"
                variant="primary"
                size="sm"
                @click="
                  isOpen = true
                  userId = member.user.id
                "
              >
                <template #icon>
                  <os-icon :icon="icons.userTimes" />
                </template>
                {{ $t('group.removeMemberButton') }}
              </os-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
import { OsBadge, OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { changeGroupMemberRoleMutation, removeUserFromGroupMutation } from '~/graphql/groups.js'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

const GROUP_ROLES = ['pending', 'usual', 'admin', 'owner']

export default {
  name: 'GroupMember',
  components: {
    OsBadge,
    OsButton,
    OsIcon,
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
      default: () => [],
    },
  },
  created() {
    this.icons = iconRegistry
    this.groupRoles = GROUP_ROLES
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

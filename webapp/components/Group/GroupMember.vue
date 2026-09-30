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
            <th class="ds-table-head-col" aria-hidden="true"></th>
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
                <avatar-image :profile="member.user" size="small" />
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
                <option v-for="role in selectableRoles" :key="role.name" :value="role.name">
                  {{ roleLabel(role) }}
                </option>
              </select>
              <os-badge v-else variant="primary">
                {{ roleLabel(roleOf(member)) }}
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
                  userName = member.user.name
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
    <os-modal
      v-if="isOpen"
      :open.sync="isOpen"
      :title="$t('group.removeMemberTitle')"
      @confirm="removeUser()"
    >
      <p class="ds-text ds-text-size-large">
        {{ $t('group.removeMemberConfirmText', { name: userName }) }}
      </p>
      <template #footer="{ confirm, cancel }">
        <os-button appearance="outline" data-testid="os-modal-cancel" @click="cancel">
          <template #icon><os-icon :icon="icons.close" /></template>
          {{ $t('actions.cancel') }}
        </os-button>
        <os-button variant="danger" data-testid="os-modal-confirm" @click="confirm">
          <template #icon><os-icon :icon="icons.check" /></template>
          {{ $t('group.removeMember') }}
        </os-button>
      </template>
    </os-modal>
  </div>
</template>
<script>
import { OsBadge, OsButton, OsIcon, OsModal } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { changeGroupMemberRoleMutation, removeUserFromGroupMutation } from '~/graphql/groups.js'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import groupRights from '~/mixins/groupRights'

// Fallback for a viewer who may manage members but not read the role definitions: render the
// roles that actually occur among the members, so the picker still shows where everybody is.
const rolesFromMembers = (members) =>
  [...new Set(members.map((member) => member.membership?.role).filter(Boolean))].map((name) => ({
    name,
    label: null,
  }))

export default {
  mixins: [groupRights],
  name: 'GroupMember',
  components: {
    OsBadge,
    OsButton,
    OsIcon,
    OsModal,
    AvatarImage,
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
    groupRoles: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    return {
      id: 'search-user-to-add-to-group',
      query: '',
      searchProcess: null,
      user: {},
      isOpen: false,
      userId: null,
      userName: null,
    }
  },
  computed: {
    // What the picker offers: the group's own definitions when they are readable, otherwise the
    // roles the members already carry. `none` is never offered — it means "no membership", and
    // removing somebody is the button next to it.
    selectableRoles() {
      const roles = this.groupRoles.length ? this.groupRoles : rolesFromMembers(this.groupMembers)
      return roles.filter((role) => role.name !== 'none')
    },
  },
  methods: {
    // The role a member carries, as a definition if the group's are known — so a custom role
    // renders with the label the group gave it rather than as its key.
    roleOf(member) {
      const name = member.membership?.role
      return this.groupRoles.find((role) => role.name === name) ?? { name, label: null }
    },
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

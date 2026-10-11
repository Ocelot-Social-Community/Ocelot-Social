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
          <tr
            v-for="member in groupMembers"
            :key="member.user.id"
            :data-test="`group-member-${member.user.id}`"
          >
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
              <!-- Disabled rather than absent where the viewer may not reshape this member at
                   all: the role still has to be readable, and an empty cell would say nothing
                   about why. -->
              <select
                v-if="mayAssignRoles && mayActOnRole(member)"
                data-test="group-member-role"
                :value="`${member.membership.role}`"
                :disabled="!mayReshape(member)"
                :title="mayReshape(member) ? null : $t('group.memberOutranked')"
                @change="changeMemberRole(member, $event)"
              >
                <option
                  v-for="role in selectableRoles"
                  :key="role.name"
                  :value="role.name"
                  :disabled="!mayAssign(member, role)"
                >
                  {{ roleLabel(role) }}
                </option>
              </select>
              <os-badge v-else variant="primary">
                {{ roleLabel(roleOf(member)) }}
              </os-badge>
            </td>
            <td class="ds-table-col">
              <!-- Not on one's own row: removing oneself is leaving, which the server refuses here
                   and the group page offers as its own action. -->
              <os-button
                v-if="mayRemoveMembers && mayActOnRole(member) && !isSelf(member)"
                data-test="group-member-remove"
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
import { mapGetters } from 'vuex'
import { OsBadge, OsButton, OsIcon, OsModal } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { removeUserFromGroupMutation } from '~/graphql/groups.js'
import { setGroupMemberRoleMutation } from '~/graphql/groupRoles.js'
import { mayAssignGroupRole } from '~/utils/groupRoleRights'
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
    // The group itself, for the rights: the member list is readable with one right and
    // ACTIONABLE with others, and a viewer who may only look must not be offered a control
    // the backend will refuse.
    group: {
      type: Object,
      required: false,
      default: null,
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
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    /**
     * Whether the viewer stands above every member, owners included: an elevated network admin
     * (backend groupRole/authority.ts, `outranksMembers`). Inside the group an owner has no
     * superior, so for everybody else an owner row stays a badge.
     */
    outranksMembers() {
      return this.group?.myGroupElevation?.outranksMembers === true
    },
    mayAssignRoles() {
      return this.canInGroup('group.member.role.assign', this.group)
    },
    mayRemoveMembers() {
      return this.canInGroup('group.member.remove', this.group)
    },
    // What the picker offers: the group's own definitions when they are readable, otherwise the
    // roles the members already carry. `none` is never offered — it means "no membership", and
    // removing somebody is the button next to it.
    /** Every key any role in this group grants — what a protected role resolves to. */
    catalogKeys() {
      return [...new Set(this.groupRoles.flatMap((role) => role.permissions ?? []))]
    },
    selectableRoles() {
      const roles = this.groupRoles.length ? this.groupRoles : rolesFromMembers(this.groupMembers)
      return roles.filter((role) => role.name !== 'none')
    },
  },
  methods: {
    mayActOnRole(member) {
      return member.membership.role !== 'owner' || this.outranksMembers
    },
    isSelf(member) {
      return member.user.id === this.currentUser?.id
    },
    /**
     * Whether this member can be put on that role at all — the same two conditions the server
     * applies (utils/groupRoleRights, mirroring groupRole/authority.ts): the viewer must hold
     * every right the role grants, and must outrank the member as they are now.
     *
     * Offered as a disabled option rather than hidden, so the picker still shows the whole
     * ladder and where this person sits on it.
     */
    mayAssign(member, role) {
      return mayAssignGroupRole({
        viewerPermissions: this.group?.myGroupPermissions ?? [],
        memberPermissions: this.permissionsOfMember(member),
        rolePermissions: this.permissionsOfRole(role),
        outranksMembers: this.outranksMembers,
      })
    },
    /** Whether the viewer may change this member's role at all — true for any role on offer. */
    mayReshape(member) {
      return this.selectableRoles.some((role) => this.mayAssign(member, role))
    },
    permissionsOfRole(role) {
      // As the server weighs it: capped by the same feature gates and network rights as the
      // viewer's own myGroupPermissions, with `owner` resolved to the catalog it stands for. The
      // raw list could never be compared with a capped set — a right switched off for everybody
      // was still in every role, and nobody could ever cover one. The raw list (and, for
      // `owner`, every key a role here knows) only where the server's answer is not at hand.
      if (role?.effectivePermissions) return role.effectivePermissions
      return role?.protected ? this.catalogKeys : (role?.permissions ?? [])
    },
    permissionsOfMember(member) {
      return this.permissionsOfRole(this.roleByName(member.membership?.role))
    },
    // The role a member carries, as a definition if the group's are known — so a custom role
    // renders with the label the group gave it rather than as its key.
    roleOf(member) {
      return this.roleByName(member.membership?.role)
    },
    /** A role definition by name, or a bare stand-in so roleLabel() can still name it. */
    roleByName(name) {
      return this.groupRoles.find((role) => role.name === name) ?? { name, label: null }
    },
    async changeMemberRole(member, event) {
      const id = member.user.id
      const newRole = event.target.value
      try {
        // setGroupMemberRole, not the deprecated ChangeGroupMemberRole: that one takes the
        // GroupMemberRole ENUM, so every role a group invented for itself failed validation
        // before it ever reached the shield.
        await this.$apollo.mutate({
          mutation: setGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: id, roleName: newRole },
        })
        // The list is the server's again: the picker is bound one way, so until the members are
        // read anew the row still carries the old role, and the next re-render (the rights
        // refetch this very change announces) would put the picker back on it.
        this.$emit('loadGroupMembers')
        this.$toast.success(
          this.$t('group.changeMemberRole', { role: this.roleLabel(this.roleByName(newRole)) }),
        )
      } catch (error) {
        // Refused: the picker shows what the member still holds, not what was asked for.
        event.target.value = member.membership.role
        this.$toastBackendError(error)
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
          this.$toastBackendError(error)
        })
        .finally(() => {
          this.userId = null
        })
    },
  },
}
</script>

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
                v-if="showRoleSelect(member)"
                :value="`${member.membership.role}`"
                @change="changeMemberRole(member, $event)"
              >
                <option
                  v-for="role in groupRoles"
                  :key="role"
                  :value="role"
                  :disabled="isRoleOptionDisabled(role, member)"
                >
                  {{ $t(`group.roles.${role}`) }}
                </option>
              </select>
              <os-badge v-else variant="primary">
                {{ $t(`group.roles.${member.membership.role}`) }}
              </os-badge>
            </td>
            <td class="ds-table-col">
              <os-button
                v-if="showRemoveButton(member)"
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
    <confirm-modal
      v-if="pendingRoleChange"
      :modalData="roleChangeModalData"
      @close="pendingRoleChange = null"
    />
  </div>
</template>
<script>
import { mapGetters } from 'vuex'
import { OsBadge, OsButton, OsIcon, OsModal } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { changeGroupMemberRoleMutation, removeUserFromGroupMutation } from '~/graphql/groups.js'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import ConfirmModal from '~/components/Modal/ConfirmModal'

const GROUP_ROLES = ['pending', 'usual', 'admin', 'owner']

export default {
  name: 'GroupMember',
  components: {
    OsBadge,
    OsButton,
    OsIcon,
    OsModal,
    AvatarImage,
    ConfirmModal,
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
    // The viewer's own role in this group — 'owner' or 'admin', since only they can reach this
    // page (see pages/groups/edit/_id.vue). Drives which rows/options are actually editable.
    myRole: {
      type: String,
      required: true,
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
      userName: null,
      // { member, newRole } while a role change that needs an explicit confirmation (promoting
      // someone to owner, or demoting yourself) is awaiting that confirmation.
      pendingRoleChange: null,
    }
  },
  computed: {
    ...mapGetters({ currentUser: 'auth/user' }),
    isOwnerViewer() {
      return this.myRole === 'owner'
    },
    isAdminViewer() {
      return this.myRole === 'admin'
    },
    roleChangeModalData() {
      const { member, newRole } = this.pendingRoleChange
      const variants = {
        promoteToOwner: {
          titleIdent: 'group.roleChangeModal.promoteToOwner.title',
          messageIdent: 'group.roleChangeModal.promoteToOwner.message',
          messageParams: { name: member.user.name },
        },
        selfDemoteOwner: {
          titleIdent: 'group.roleChangeModal.selfDemoteOwner.title',
          messageIdent: 'group.roleChangeModal.selfDemoteOwner.message',
          messageParams: {},
        },
        selfDemoteAdmin: {
          titleIdent: 'group.roleChangeModal.selfDemoteAdmin.title',
          messageIdent: 'group.roleChangeModal.selfDemoteAdmin.message',
          messageParams: {},
        },
      }
      const { titleIdent, messageIdent, messageParams } =
        variants[this.roleChangeVariant(member, newRole)]
      return {
        titleIdent,
        messageIdent,
        messageParams,
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.check,
            textIdent: 'group.modal.confirm',
            callback: () => this.commitRoleChange(member.user.id, newRole),
          },
          cancel: {
            icon: this.icons.close,
            textIdent: 'actions.cancel',
            callback: () => {},
          },
        },
      }
    },
  },
  methods: {
    isSelf(member) {
      return member.user.id === this.currentUser.id
    },
    // Whether this row gets an interactive role control at all — otherwise it's the plain
    // read-only badge, same treatment an owner row always got.
    showRoleSelect(member) {
      const role = member.membership.role
      if (role === 'owner') {
        // Nobody may change another owner's role — an owner may only ever change their own.
        return this.isOwnerViewer && this.isSelf(member)
      }
      if (this.isAdminViewer && role === 'admin' && !this.isSelf(member)) {
        // An admin may not touch a fellow admin's role at all.
        return false
      }
      return true
    },
    // Options the viewer isn't actually allowed to pick for this row — shown but disabled,
    // rather than removed, so an admin can see the admin/owner rungs exist without being able
    // to use them (mirrors the backend's isAllowedToChangeGroupMemberRole).
    isRoleOptionDisabled(role, member) {
      if (this.isOwnerViewer) {
        if (this.isSelf(member)) {
          // Self-demotion: 'owner' is the current (no-op) role, 'pending' makes no sense here.
          return role === 'owner' || role === 'pending'
        }
        return false
      }
      if (this.isAdminViewer) {
        if (this.isSelf(member)) {
          // Self-demotion only goes to 'usual'.
          return role !== 'usual'
        }
        return role === 'admin' || role === 'owner'
      }
      return true
    },
    showRemoveButton(member) {
      // Self-removal isn't offered here — leaving the group is the JoinLeaveButton's job.
      if (this.isSelf(member)) return false
      const role = member.membership.role
      if (role === 'owner') return false
      if (this.isAdminViewer && role === 'admin') return false
      return true
    },
    // Which of the three consequential changes this is, or null for an ordinary role change
    // that needs no extra confirmation beyond picking it in the select.
    roleChangeVariant(member, newRole) {
      if (!this.isSelf(member) && newRole === 'owner') return 'promoteToOwner'
      if (this.isSelf(member) && this.isOwnerViewer) return 'selfDemoteOwner'
      if (this.isSelf(member) && this.isAdminViewer) return 'selfDemoteAdmin'
      return null
    },
    changeMemberRole(member, event) {
      const newRole = event.target.value
      if (this.roleChangeVariant(member, newRole)) {
        this.pendingRoleChange = { member, newRole }
        return
      }
      this.commitRoleChange(member.user.id, newRole)
    },
    async commitRoleChange(userId, newRole) {
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId, roleInGroup: newRole },
        })
        this.$toast.success(
          this.$t('group.changeMemberRole', { role: this.$t(`group.roles.${newRole}`) }),
        )
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.pendingRoleChange = null
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

<template>
  <div class="add-group-member">
    <h2 class="title">{{ $t('group.addUser') }}</h2>
    <div class="ds-mb-small"></div>
    <div class="ds-mb-large">
      <select-user-search :id="id" ref="selectUserSearch" @select-user="selectUser" />
      <os-modal
        v-if="isOpen"
        :title="$t('group.addMember')"
        :open.sync="isOpen"
        @close="closeModal"
        @confirm="confirmModal"
        @cancel="cancelModal"
      >
        <p class="ds-text ds-text-size-large">
          {{ $t('group.modal.confirmAddGroupMemberText', { name: user.name }) }}
        </p>
        <template #footer="{ confirm, cancel }">
          <os-button appearance="outline" @click="cancel">
            <template #icon><os-icon :icon="icons.close" /></template>
            {{ $t('group.modal.cancel') }}
          </os-button>
          <os-button variant="primary" @click="confirm">
            <template #icon><os-icon :icon="icons.check" /></template>
            {{ $t('group.modal.confirm') }}
          </os-button>
        </template>
      </os-modal>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon, OsModal } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { setGroupMemberRoleMutation } from '~/graphql/groupRoles.js'
import SelectUserSearch from '~/components/generic/SelectUserSearch/SelectUserSearch'
import { USUAL_GROUP_ROLE } from '~/constants/groups'
import groupRights from '~/mixins/groupRights'

export default {
  mixins: [groupRights],
  name: 'AddGroupMember',
  components: {
    OsButton,
    OsIcon,
    OsModal,
    SelectUserSearch,
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
    // The group's own role definitions, for naming the role somebody is added as. Optional:
    // reading them needs group.role.manage, and adding a member does not.
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
      user: {},
      isOpen: false,
    }
  },
  methods: {
    cancelModal() {
      this.$refs.selectUserSearch.clear()
      this.isOpen = false
    },
    closeModal() {
      this.$refs.selectUserSearch.clear()
      this.isOpen = false
    },
    confirmModal() {
      this.addMemberToGroup()
      this.isOpen = false
      this.$refs.selectUserSearch.clear()
    },
    selectUser(user) {
      this.user = user
      if (this.groupMembers.find((member) => member.id === this.user.id)) {
        this.$toast.error(this.$t('group.errors.userAlreadyMember', { name: this.user.name }))
        this.$refs.selectUserSearch.clear()
        return
      }
      this.isOpen = true
    },
    async addMemberToGroup() {
      // Somebody added by hand lands in the group's member role. `usual` by name because it is
      // a system role: a group may relabel it, never rename or delete it — which is also why
      // the label comes from the definition when the page could read one.
      const newRole = USUAL_GROUP_ROLE
      const username = this.user.name
      try {
        await this.$apollo.mutate({
          mutation: setGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: this.user.id, roleName: newRole },
        })
        this.$toast.success(
          this.$t('group.addMemberToGroupSuccess', {
            role: this.roleLabel(
              this.groupRoles.find((role) => role.name === newRole) ?? { name: newRole },
            ),
            name: username,
          }),
        )
        this.$emit('loadGroupMembers')
      } catch (error) {
        this.$toastBackendError(error)
      }
    },
  },
}
</script>

<style>
.add-group-member {
  background-color: var(--color-neutral-100);
  padding: var(--space-base);
}
</style>

<template>
  <div class="add-group-member">
    <h2 class="title">{{ $t('group.addUser') }}</h2>
    <div class="ds-mb-small"></div>
    <div class="ds-mb-large">
      <select-user-search :id="id" ref="selectUserSearch" @select-user="selectUser" />
      <os-confirm-dialog
        v-if="isOpen"
        :open="isOpen"
        :title="$t('group.addMember')"
        :message="$t('group.modal.confirmAddGroupMemberText', { name: user.name })"
        :confirm-label="$t('group.modal.confirm')"
        :cancel-label="$t('group.modal.cancel')"
        :close-label="$t('actions.close')"
        :confirm-icon="icons.check"
        :cancel-icon="icons.close"
        :loading="loading"
        @confirm="confirmModal"
        @cancel="cancelModal"
      />
    </div>
  </div>
</template>

<script>
import { escape } from 'lodash'
import { OsConfirmDialog } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { setGroupMemberRoleMutation } from '~/graphql/groupRoles.js'
import SelectUserSearch from '~/components/generic/SelectUserSearch/SelectUserSearch'
import { USUAL_GROUP_ROLE } from '~/constants/groups'
import groupRights from '~/mixins/groupRights'

export default {
  mixins: [groupRights],
  name: 'AddGroupMember',
  components: {
    OsConfirmDialog,
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
      loading: false,
    }
  },
  methods: {
    cancelModal() {
      this.$refs.selectUserSearch.clear()
      this.isOpen = false
    },
    // The dialog stays open, its confirm button spinning and cancel blocked, until the mutation
    // is through: no second click, no closing under a running request. addMemberToGroup reports
    // success and failure itself (toasts); after a failure the dialog stays for another try.
    async confirmModal() {
      this.loading = true
      const added = await this.addMemberToGroup().finally(() => {
        this.loading = false
      })
      if (added) {
        this.isOpen = false
        this.$refs.selectUserSearch.clear()
      }
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
      const { name, slug } = this.user
      try {
        await this.$apollo.mutate({
          mutation: setGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: this.user.id, roleName: newRole },
        })
        this.$toast.success(
          this.$t('group.addMemberToGroupSuccess', {
            // The toast renders its text as HTML; the role's label, the name and the slug are
            // user content (a group names its roles itself): escape them.
            role: escape(
              this.roleLabel(
                this.groupRoles.find((role) => role.name === newRole) ?? { name: newRole },
              ),
            ),
            name: escape(name),
            slug: escape(slug),
          }),
        )
        this.$emit('loadGroupMembers')
        return true
      } catch (error) {
        this.$toastBackendError(error)
        return false
      }
    },
  },
}
</script>

<style>
.add-group-member {
  background-color: var(--background-color-base);
  padding: var(--space-base);
}
</style>

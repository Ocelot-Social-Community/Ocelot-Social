<template>
  <os-card>
    <h2 class="title">{{ $t('group.rights.title') }}</h2>
    <p class="description">{{ $t('group.rights.description') }}</p>

    <!-- What the group IS, derived from what it grants outsiders. The type is no longer a
         separate choice: these two rights are the choice, and this says so while they are
         being ticked rather than after saving. -->
    <p class="resulting-type" data-test="resulting-type">
      {{ $t('group.rights.resultingType') }}
      <strong>{{ $t(`group.types.${resultingType}`) }}</strong>
    </p>

    <!-- Simple mode: the handful of questions a group actually asks itself, as sentences.
         The matrix is one click away for whoever wants it, but it must not be the entry. -->
    <section v-if="!advanced" data-test="rights-simple">
      <ul class="switches">
        <li v-for="item in simpleSwitches" :key="item.id" class="switch">
          <label :class="{ 'switch--disabled': !item.editable }" :title="item.hint">
            <input
              type="checkbox"
              :checked="item.enabled"
              :disabled="!item.editable || saving"
              :data-test="`switch-${item.id}`"
              @change="toggleSimple(item, $event.target.checked)"
            />
            <span>{{ item.label }}</span>
          </label>
        </li>
      </ul>

      <div class="actions">
        <os-button
          :disabled="saving || !canManageRoles"
          data-test="preset-channel"
          @click="applyChannelPreset"
        >
          {{ $t('group.rights.presets.channel') }}
        </os-button>
        <os-button :disabled="saving || !canManageRoles" data-test="reset" @click="confirmReset">
          {{ $t('group.rights.reset') }}
        </os-button>
        <button type="button" class="link" data-test="to-advanced" @click="advanced = true">
          {{ $t('group.rights.toAdvanced') }}
        </button>
      </div>
    </section>

    <!-- Advanced mode: the full matrix, one tab per role. -->
    <section v-else data-test="rights-advanced">
      <div class="role-tabs">
        <button
          v-for="role in orderedRoles"
          :key="role.name"
          type="button"
          class="role-tab"
          :class="{ 'role-tab--active': role.name === activeRoleName }"
          :data-test="`role-tab-${role.name}`"
          @click="activeRoleName = role.name"
        >
          {{ roleLabel(role) }}
          <span v-if="role.system" class="role-tab__badge" :title="$t('group.rights.systemRole')">
            ★
          </span>
        </button>
        <button
          v-if="canManageRoles"
          type="button"
          class="role-tab role-tab--add"
          :title="$t('group.rights.addRole')"
          data-test="role-add"
          @click="startCreate"
        >
          +
        </button>
      </div>

      <form
        v-if="creating"
        class="role-create"
        data-test="role-create"
        @submit.prevent="createRole"
      >
        <input
          v-model="newRoleName"
          type="text"
          :placeholder="$t('group.rights.roleKeyPlaceholder')"
          data-test="new-role-name"
        />
        <input
          v-model="newRoleLabel"
          type="text"
          :placeholder="$t('group.rights.roleLabelPlaceholder')"
          data-test="new-role-label"
        />
        <os-button type="submit" :disabled="!newRoleName || saving">
          {{ $t('actions.save') }}
        </os-button>
        <button type="button" class="link" @click="creating = false">
          {{ $t('actions.cancel') }}
        </button>
      </form>

      <template v-if="activeRole">
        <header class="role-header">
          <label class="role-label">
            {{ $t('group.rights.labelField') }}
            <input
              v-model="draftLabel"
              type="text"
              :placeholder="roleLabel({ name: activeRole.name })"
              :disabled="!canManageRoles || saving"
              data-test="role-label-input"
            />
          </label>
          <span v-if="activeRole.memberCount !== null" class="role-members">
            {{ $t('group.rights.members', { count: activeRole.memberCount }) }}
          </span>
        </header>

        <p v-if="activeRole.protected" class="role-note" data-test="owner-note">
          {{ $t('group.rights.ownerHoldsEverything') }}
        </p>

        <div v-else class="perm-groups">
          <fieldset v-for="group in catalogGroups" :key="group.name" class="perm-group">
            <legend>{{ $t(`group.rights.groups.${group.name}`) }}</legend>
            <label
              v-for="permission in group.permissions"
              :key="permission.key"
              class="perm-row"
              :class="{ 'perm-row--blocked': !grantable(permission) }"
              :title="blockedHint(permission)"
            >
              <input
                type="checkbox"
                :checked="draftPermissions.includes(permission.key)"
                :disabled="!canManageRoles || !grantable(permission) || saving"
                :data-test="`perm-${permission.key}`"
                @change="togglePermission(permission.key, $event.target.checked)"
              />
              <span class="perm-row__key">{{ permission.key }}</span>
              <span class="perm-row__description">{{ permission.description }}</span>
            </label>
          </fieldset>
        </div>

        <div class="actions">
          <os-button
            v-if="!activeRole.protected"
            :disabled="!dirty || saving || !canManageRoles"
            data-test="save"
            @click="save"
          >
            {{ $t('actions.save') }}
          </os-button>
          <os-button :disabled="!dirty || saving" data-test="revert" @click="resetDraft">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            v-if="!activeRole.system && canManageRoles"
            :disabled="saving"
            data-test="role-delete"
            @click="confirmDelete"
          >
            {{ $t('group.rights.deleteRole') }}
          </os-button>
          <button type="button" class="link" data-test="to-simple" @click="advanced = false">
            {{ $t('group.rights.toSimple') }}
          </button>
        </div>
      </template>
    </section>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'

import {
  createGroupRoleMutation,
  deleteGroupRoleMutation,
  groupRightsQuery,
  resetGroupRolesMutation,
  updateGroupRoleMutation,
} from '~/graphql/groupRoles.js'
import { NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { privacyLevelOf } from '~/utils/groupPrivacyLevel'
import groupRights from '~/mixins/groupRights'

// The order the tabs read in: the ladder, then whatever the group invented.
const ROLE_ORDER = [NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE]

// The simple mode, declared rather than hand-written per row: one sentence, one role, one right.
const SIMPLE_SWITCHES = [
  { id: 'members-post', role: USUAL_GROUP_ROLE, permission: 'group.post.create' },
  { id: 'members-comment', role: USUAL_GROUP_ROLE, permission: 'group.comment.create' },
  { id: 'members-chat', role: USUAL_GROUP_ROLE, permission: 'group.chat.participate' },
  { id: 'members-invite', role: USUAL_GROUP_ROLE, permission: 'group.invite' },
  { id: 'applicants-read', role: PENDING_GROUP_ROLE, permission: 'group.content.read' },
  { id: 'nonmembers-read', role: NONE_GROUP_ROLE, permission: 'group.content.read' },
  { id: 'nonmembers-members', role: NONE_GROUP_ROLE, permission: 'group.members.read' },
]

export default {
  mixins: [groupRights],
  components: { OsButton, OsCard },
  props: {
    group: { type: Object, required: true },
  },
  data() {
    return {
      catalog: [],
      roles: [],
      myGroupPermissions: [],
      advanced: false,
      activeRoleName: USUAL_GROUP_ROLE,
      draftPermissions: [],
      draftLabel: '',
      creating: false,
      newRoleName: '',
      newRoleLabel: '',
      saving: false,
    }
  },
  computed: {
    canManageRoles() {
      return this.myGroupPermissions.includes('group.role.manage')
    },
    orderedRoles() {
      const rank = (role) => {
        const index = ROLE_ORDER.indexOf(role.name)
        if (index !== -1) return index
        // Custom roles sit between the member role and the owner, ordered by breadth so the
        // tabs read as a ladder rather than as an alphabet.
        return role.protected ? 100 : 10 + role.permissions.length / 100
      }
      return [...this.roles].sort((a, b) => rank(a) - rank(b))
    },
    activeRole() {
      return this.roles.find((role) => role.name === this.activeRoleName) ?? null
    },
    // Live, from the draft: while the non-member role is the one being edited, the unsaved
    // ticks are what counts — otherwise the badge would lag one save behind.
    nonMemberPermissions() {
      if (this.activeRoleName === NONE_GROUP_ROLE) {
        return this.draftPermissions
      }
      return this.roles.find((role) => role.name === NONE_GROUP_ROLE)?.permissions ?? []
    },
    resultingType() {
      return privacyLevelOf(this.nonMemberPermissions)
    },
    catalogGroups() {
      const groups = []
      for (const permission of this.catalog) {
        let group = groups.find((candidate) => candidate.name === permission.group)
        if (!group) {
          group = { name: permission.group, permissions: [] }
          groups.push(group)
        }
        group.permissions.push(permission)
      }
      return groups
    },
    dirty() {
      if (!this.activeRole) return false
      const stored = [...this.activeRole.permissions].sort().join(',')
      const draft = [...this.draftPermissions].sort().join(',')
      return stored !== draft || (this.activeRole.label ?? '') !== this.draftLabel
    },
    simpleSwitches() {
      return SIMPLE_SWITCHES.map((item) => {
        const role = this.roles.find((candidate) => candidate.name === item.role)
        const permission = this.catalog.find((entry) => entry.key === item.permission)
        const editable = this.canManageRoles && !!role && !!permission && this.grantable(permission)
        return {
          ...item,
          label: this.$t(`group.rights.simple.${item.id}`),
          enabled: !!role?.permissions.includes(item.permission),
          editable,
          hint: editable ? null : this.blockedHint(permission) || this.$t('group.rights.noRight'),
        }
      })
    },
  },
  watch: {
    activeRoleName() {
      this.resetDraft()
    },
  },
  methods: {
    /**
     * A right can only be handed out by somebody who holds it — the same coverage rule the
     * backend enforces. Showing an ineffective checkbox would promise an effect that the save
     * would then refuse.
     */
    grantable(permission) {
      return !!permission && this.myGroupPermissions.includes(permission.key)
    },
    blockedHint(permission) {
      if (!permission) return null
      if (permission.requiresNetworkPermission && !this.grantable(permission)) {
        return this.$t('group.rights.blockedByNetwork', {
          permission: permission.requiresNetworkPermission,
        })
      }
      if (permission.gatedBy?.length && !this.grantable(permission)) {
        return this.$t('group.rights.blockedByFeature', { feature: permission.gatedBy.join(', ') })
      }
      return null
    },
    resetDraft() {
      this.draftPermissions = this.activeRole ? [...this.activeRole.permissions] : []
      this.draftLabel = this.activeRole?.label ?? ''
    },
    togglePermission(key, enabled) {
      this.draftPermissions = enabled
        ? [...this.draftPermissions, key]
        : this.draftPermissions.filter((candidate) => candidate !== key)
    },
    async writeRole(name, permissions, label) {
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: updateGroupRoleMutation(),
          variables: { groupId: this.group.id, name, permissions, label: label || null },
        })
        this.mergeRole(data.updateGroupRole)
        this.$toast.success(this.$t('group.rights.saved'))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
    mergeRole(role) {
      const index = this.roles.findIndex((candidate) => candidate.name === role.name)
      if (index === -1) {
        this.roles = [...this.roles, role]
      } else {
        this.roles = this.roles.map((candidate) =>
          candidate.name === role.name ? role : candidate,
        )
      }
      if (role.name === this.activeRoleName) this.resetDraft()
    },
    save() {
      if (!this.activeRole) return
      // The owner role keeps no list — only its label can move.
      const permissions = this.activeRole.protected ? [] : this.draftPermissions
      return this.writeRole(this.activeRole.name, permissions, this.draftLabel)
    },
    toggleSimple(item, enabled) {
      const role = this.roles.find((candidate) => candidate.name === item.role)
      if (!role) return
      const permissions = enabled
        ? [...role.permissions, item.permission]
        : role.permissions.filter((key) => key !== item.permission)
      return this.writeRole(role.name, permissions, role.label)
    },
    /**
     * The read-only channel from #5588: members read, only admins write. Expressed as the
     * three rights it actually is rather than as a mode the backend would have to know about.
     */
    async applyChannelPreset() {
      const role = this.roles.find((candidate) => candidate.name === USUAL_GROUP_ROLE)
      if (!role) return
      const removed = ['group.post.create', 'group.comment.create']
      await this.writeRole(
        role.name,
        role.permissions.filter((key) => !removed.includes(key)),
        role.label,
      )
    },
    startCreate() {
      this.creating = true
      this.newRoleName = ''
      this.newRoleLabel = ''
    },
    async createRole() {
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: createGroupRoleMutation(),
          variables: {
            groupId: this.group.id,
            name: this.newRoleName.trim(),
            label: this.newRoleLabel.trim() || null,
            // A new role starts from what a member may do, which is the useful starting point
            // for "a member plus something" — the usual reason to add a role at all.
            permissions:
              this.roles.find((role) => role.name === USUAL_GROUP_ROLE)?.permissions ?? [],
          },
        })
        this.mergeRole(data.createGroupRole)
        this.activeRoleName = data.createGroupRole.name
        this.creating = false
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
    async confirmDelete() {
      if (!this.activeRole || this.activeRole.system) return
      // Members have to land somewhere, or their membership would point at a role that is gone.
      const reassignTo = USUAL_GROUP_ROLE
      if (
        !window.confirm(
          this.$t('group.rights.confirmDelete', {
            role: this.roleLabel(this.activeRole),
            target: this.roleLabel({ name: reassignTo }),
          }),
        )
      ) {
        return
      }
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: deleteGroupRoleMutation(),
          variables: { groupId: this.group.id, name: this.activeRole.name, reassignTo },
        })
        this.roles = this.roles.filter((role) => role.name !== this.activeRole.name)
        this.activeRoleName = USUAL_GROUP_ROLE
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
    async confirmReset() {
      if (!window.confirm(this.$t('group.rights.confirmReset'))) return
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: resetGroupRolesMutation(),
          variables: { groupId: this.group.id },
        })
        this.roles = data.resetGroupRoles
        this.resetDraft()
        this.$toast.success(this.$t('group.rights.saved'))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
  },
  apollo: {
    rights: {
      query() {
        return groupRightsQuery()
      },
      variables() {
        return { id: this.group.id }
      },
      manual: true,
      result({ data, loading }) {
        if (loading || !data) return
        this.catalog = data.groupPermissionCatalog ?? []
        const group = data.Group?.[0]
        this.roles = group?.roles ?? []
        this.myGroupPermissions = group?.myGroupPermissions ?? []
        this.resetDraft()
      },
    },
  },
}
</script>

<style scoped>
.title {
  margin-bottom: 0;
}
.resulting-type {
  margin-bottom: var(--space-small);
  color: var(--text-color-soft);
}

.description {
  color: var(--text-color-soft);
  margin-bottom: var(--space-base);
}
.switches {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-base);
}
.switch {
  padding: var(--space-xx-small) 0;

  label {
    display: flex;
    gap: var(--space-x-small);
    align-items: baseline;
    cursor: pointer;
  }
}
.switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  align-items: center;
  margin-top: var(--space-base);
}
.link {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;
}
.role-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xx-small);
  margin-bottom: var(--space-small);
}
.role-tab {
  border: 1px solid var(--border-color-softer);
  border-radius: var(--border-radius-base);
  background: var(--background-color-softest);
  padding: var(--space-xx-small) var(--space-x-small);
  cursor: pointer;
}
.role-tab--active {
  border-color: var(--color-primary);
  font-weight: bold;
}
.role-tab__badge {
  color: var(--text-color-soft);
}
.role-create {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-x-small);
  margin-bottom: var(--space-small);
}
.role-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  justify-content: space-between;
  align-items: baseline;
}
.role-members {
  color: var(--text-color-soft);
}
.role-note {
  color: var(--text-color-soft);
}
.perm-groups {
  display: grid;
  gap: var(--space-small);

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
}
.perm-group {
  border: 1px solid var(--border-color-softer);
  border-radius: var(--border-radius-base);
  padding: var(--space-x-small);
}
.perm-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-xx-small) var(--space-x-small);
  align-items: baseline;
  padding: var(--space-xxx-small) 0;
  cursor: pointer;
}
.perm-row--blocked {
  opacity: 0.5;
  cursor: not-allowed;
}
.perm-row__key {
  grid-column: 2;
  font-family: monospace;
  font-size: var(--font-size-small);
}
.perm-row__description {
  grid-column: 2;
  color: var(--text-color-soft);
  font-size: var(--font-size-small);
}
</style>

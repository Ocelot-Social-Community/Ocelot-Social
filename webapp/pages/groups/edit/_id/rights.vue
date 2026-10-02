<template>
  <os-card>
    <h2 class="title">{{ $t('group.rights.title') }}</h2>
    <p class="description">{{ $t('group.rights.description') }}</p>

    <!-- Simple mode: the handful of questions a group actually asks itself, as sentences, with
         what those answers MAKE the group above them. The matrix is one click away for whoever
         wants it, but it must not be the entry. -->
    <section v-if="!advanced" data-test="rights-simple">
      <group-rights-simple
        :roles="roles"
        :catalog="catalog"
        :caption="$t('group.rights.resultingType')"
        :disabled="saving || !canManageRoles"
        :disabled-hint="$t('group.rights.noRight')"
        :grantable="grantable"
        :hint-for="blockedHint"
        @toggle="toggleSimple"
      >
        <template #actions>
          <div class="actions">
            <os-button
              :disabled="saving || !canManageRoles"
              data-test="preset-channel"
              @click="applyChannelPreset"
            >
              {{ $t('group.rights.presets.channel') }}
            </os-button>
            <os-button
              :disabled="saving || !canManageRoles"
              data-test="reset"
              @click="confirmReset"
            >
              {{ $t('group.rights.reset') }}
            </os-button>
            <button type="button" class="link" data-test="to-advanced" @click="advanced = true">
              {{ $t('group.rights.toAdvanced') }}
            </button>
          </div>
        </template>
      </group-rights-simple>
    </section>

    <!-- Advanced mode: the full matrix, one tab per role. The resulting visibility is stated
         here too — the `none` role is editable in this view, so it can change under the cursor. -->
    <section v-else data-test="rights-advanced">
      <p class="resulting-type" data-test="resulting-type">
        {{ $t('group.rights.resultingType') }}
        <strong>{{ $t(`group.types.${resultingType}`) }}</strong>
      </p>
      <role-tabs
        :roles="orderedRoles"
        :active-name="activeRoleName"
        :label-for="roleLabel"
        :badge-for="(role) => role.system"
        :badge-title="$t('group.rights.systemRole')"
        @select="activeRoleName = $event"
        @hover="hoveredRoleName = $event"
      >
        <template #extra>
          <button
            v-if="canManageRoles"
            type="button"
            class="role-tab-add"
            :title="$t('group.rights.addRole')"
            :aria-label="$t('group.rights.addRole')"
            data-test="role-add"
            @click="startCreate"
          >
            <os-icon :icon="icons.plus" />
          </button>
        </template>
      </role-tabs>

      <form
        v-if="creating"
        class="role-create"
        data-test="role-create"
        @submit.prevent="createRole"
      >
        <ocelot-input
          v-model="newRoleName"
          :placeholder="$t('group.rights.roleKeyPlaceholder')"
          :aria-label="$t('group.rights.roleKeyPlaceholder')"
          data-test="new-role-name"
        />
        <ocelot-input
          v-model="newRoleLabel"
          :placeholder="$t('group.rights.roleLabelPlaceholder')"
          :aria-label="$t('group.rights.roleLabelPlaceholder')"
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
          <ocelot-input
            v-model="draftLabel"
            class="role-label"
            :label="$t('group.rights.labelField')"
            :placeholder="roleLabel({ name: activeRole.name })"
            :disabled="!canManageRoles || saving"
            data-test="role-label"
          />
          <span v-if="activeRole.memberCount !== null" class="role-members">
            {{ $t('group.rights.members', { count: activeRole.memberCount }) }}
          </span>
        </header>

        <p v-if="activeRole.protected" class="role-note" data-test="owner-note">
          {{ $t('group.rights.ownerHoldsEverything') }}
        </p>

        <permission-matrix
          v-else
          :permissions="catalog"
          :granted="draftPermissions"
          :diff="hoverDiff"
          :group-label="(name) => $t(`permissions.sections.${name}`)"
          :disabled-for="
            (permission) =>
              !canManageRoles ||
              !grantable(permission) ||
              saving ||
              isMandatory(permission) ||
              isMoot(permission)
          "
          :hint-for="blockedHint"
          @toggle="togglePermission"
        />

        <div class="actions">
          <!-- Also for the owner role: its RIGHTS cannot be edited (it holds the catalog), but
               its name can — "Owner" is what a group calls the person, and some call it
               something else. The backend takes a relabel of a protected role for the same
               reason; the button being hidden was the only thing in the way. -->
          <os-button :disabled="!dirty || saving || !canManageRoles" data-test="save" @click="save">
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
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import OcelotInput from '~/components/OcelotInput/OcelotInput'
import GroupRightsSimple from '~/components/Permissions/GroupRightsSimple'
import PermissionMatrix from '~/components/Permissions/PermissionMatrix'
import RoleTabs from '~/components/Permissions/RoleTabs'

import {
  createGroupRoleMutation,
  deleteGroupRoleMutation,
  groupRightsQuery,
  resetGroupRolesMutation,
  updateGroupRoleMutation,
} from '~/graphql/groupRoles.js'
import { NONE_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { MANDATORY_GROUP_RIGHTS } from '~/constants/groups'
import { iconRegistry } from '~/utils/iconRegistry'
import { privacyLevelOf } from '~/utils/groupPrivacyLevel'
import { orderRolesByPrivilege } from '~/utils/groupRights'
import { diffBetween, isRoleDirty, permissionSetOf } from '~/utils/permissionDiff'
import groupRights from '~/mixins/groupRights'

export default {
  mixins: [groupRights],
  components: {
    GroupRightsSimple,
    OcelotInput,
    OsButton,
    OsCard,
    OsIcon,
    PermissionMatrix,
    RoleTabs,
  },
  props: {
    group: { type: Object, required: true },
  },
  data() {
    return {
      icons: iconRegistry,
      catalog: [],
      roles: [],
      myGroupPermissions: [],
      advanced: false,
      activeRoleName: USUAL_GROUP_ROLE,
      // The role tab under the cursor, to preview what it would change about the one being
      // edited — the same affordance the network and template role pages have.
      hoveredRoleName: null,
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
      return orderRolesByPrivilege(this.roles)
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
    // Hovering another role marks every right it would change against the DRAFT: 'added'
    // where the hovered role grants what this one does not, 'removed' the other way round.
    hoverDiff() {
      if (!this.hoveredRoleName || this.hoveredRoleName === this.activeRoleName) return {}
      const hovered = this.roles.find((role) => role.name === this.hoveredRoleName)
      if (!hovered) return {}
      return diffBetween(
        this.catalog,
        new Set(this.draftPermissions),
        this.permissionSetOf(hovered),
      )
    },
    dirty() {
      return isRoleDirty(this.activeRole, this.draftPermissions, this.draftLabel)
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
    /**
     * A right the role cannot be written without, so the box is ticked and locked rather than
     * offered: `group.leave` on anything that IS a membership. Without it the only way out of
     * the group would be somebody else removing you (see groupRole/mandatoryRights.ts).
     */
    /**
     * A right that means nothing for this role: `group.leave` on the non-member role, which has
     * no membership to end. Greyed rather than offered — a checkbox that changes nothing is
     * worse than one that is not there.
     */
    isMoot(permission) {
      return (
        this.activeRoleName === NONE_GROUP_ROLE && MANDATORY_GROUP_RIGHTS.includes(permission?.key)
      )
    },
    isMandatory(permission) {
      // The simple view asks about rights the catalog may not carry yet, so a missing entry is
      // a legitimate argument here and answers "no" rather than throwing.
      return (
        this.activeRoleName !== NONE_GROUP_ROLE && MANDATORY_GROUP_RIGHTS.includes(permission?.key)
      )
    },
    grantable(permission) {
      return !!permission && this.myGroupPermissions.includes(permission.key)
    },
    blockedHint(permission) {
      if (this.isMoot(permission)) {
        return this.$t('group.rights.moot')
      }
      if (this.isMandatory(permission)) {
        return this.$t('group.rights.mandatory')
      }
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
    // What a role effectively grants. `owner` stores no list and resolves to the whole
    // catalog, so hovering it has to show that rather than an empty role.
    permissionSetOf(role) {
      return permissionSetOf(role, this.catalog)
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
        // The checkbox is where the click left it, and `:checked` binds a value that did not
        // change — so without this the switch keeps showing a right the group does not have.
        this.$forceUpdate()
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
    toggleSimple(roleName, permissionKey, enabled) {
      const role = this.roles.find((candidate) => candidate.name === roleName)
      if (!role) return
      const permissions = enabled
        ? [...role.permissions, permissionKey]
        : role.permissions.filter((key) => key !== permissionKey)
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
/* The pill row and the matrix are shared components now (components/Permissions/*); what is
   left here is this page's own furniture. */
.role-tab-add {
  border: 1px dashed var(--border-color-soft);
  border-radius: var(--border-radius-x-large);
  background: var(--background-color-base);
  padding: var(--space-xx-small) var(--space-small);
  font-weight: bold;
  cursor: pointer;
}
.role-tab-add:hover {
  background: var(--background-color-softer);
}

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
</style>

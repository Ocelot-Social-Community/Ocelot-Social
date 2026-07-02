<template>
  <os-card>
    <h2 class="title">{{ $t('admin.roles.title') }}</h2>
    <p class="description">{{ $t('admin.roles.description') }}</p>

    <!-- Role switcher: one pill per role, plus an add button that turns into a
         name input. Only the active role's permissions are shown below. -->
    <div class="role-tabs" data-test="role-tabs">
      <button
        v-for="role in orderedRoles"
        :key="role.name"
        type="button"
        class="role-tab"
        :class="{ 'role-tab--active': role.name === activeRoleName }"
        :data-test="`role-tab-${role.name}`"
        @click="setActive(role.name)"
        @mouseenter="hoveredRoleName = role.name"
        @mouseleave="hoveredRoleName = null"
      >
        {{ role.name }}
        <span v-if="role.protected" class="role-tab__badge" :title="$t('admin.roles.protected')">
          ★
        </span>
      </button>

      <!-- Add a role: the + button morphs into a name input -->
      <button
        v-if="!creating"
        type="button"
        class="role-tab role-tab--add"
        :title="$t('admin.roles.create')"
        :aria-label="$t('admin.roles.create')"
        data-test="role-add"
        @click="startCreate"
      >
        +
      </button>
      <span v-else class="role-tab role-tab--input" data-test="role-create">
        <input
          ref="newRoleInput"
          v-model="newRole.name"
          type="text"
          class="role-tab__input"
          :placeholder="$t('admin.roles.nameLabel')"
          :aria-label="$t('admin.roles.create')"
          data-test="new-role-name"
          @keyup.enter="createRole"
          @keyup.esc="cancelCreate"
        />
        <button
          type="button"
          class="role-tab__confirm"
          :disabled="!newRole.name || saving"
          :aria-label="$t('admin.roles.create')"
          data-test="new-role-create"
          @click="createRole"
        >
          ✓
        </button>
        <button
          type="button"
          class="role-tab__cancel"
          :aria-label="$t('actions.cancel')"
          @click="cancelCreate"
        >
          ✕
        </button>
      </span>
    </div>

    <!-- Active role -->
    <section v-if="activeRole" class="role" :data-test="`role-${activeRole.name}`">
      <header class="role__header">
        <h3 class="role__name">
          <template v-if="!renaming">
            <span class="role__label">{{ $t('admin.roles.roleLabel') }}:</span>
            {{ activeRole.name }}
            <button
              v-if="canRename(activeRole)"
              type="button"
              class="role__rename"
              :title="$t('admin.roles.rename')"
              :aria-label="$t('admin.roles.rename')"
              data-test="role-rename"
              @click="startRename"
            >
              ✎
            </button>
            <span v-if="activeRole.protected" class="role__badge">
              {{ $t('admin.roles.protected') }}
            </span>
          </template>
          <span v-else class="role-tab role-tab--input" data-test="role-rename-edit">
            <input
              ref="renameInput"
              v-model="renameValue"
              type="text"
              class="role-tab__input"
              :placeholder="$t('admin.roles.nameLabel')"
              :aria-label="$t('admin.roles.rename')"
              data-test="rename-role-name"
              @keyup.enter="renameRole"
              @keyup.esc="cancelRename"
            />
            <button
              type="button"
              class="role-tab__confirm"
              :disabled="!renameValue.trim() || renameValue.trim() === activeRole.name || saving"
              :aria-label="$t('admin.roles.rename')"
              data-test="rename-role-confirm"
              @click="renameRole"
            >
              ✓
            </button>
            <button
              type="button"
              class="role-tab__cancel"
              :aria-label="$t('actions.cancel')"
              @click="cancelRename"
            >
              ✕
            </button>
          </span>
        </h3>
        <nuxt-link
          class="role__members"
          :to="{ name: 'admin-users', query: { q: `role:${activeRole.name}` } }"
          :data-test="`role-${activeRole.name}-members`"
        >
          {{ $t('admin.roles.members', { count: activeRole.memberCount || 0 }) }}
        </nuxt-link>
      </header>

      <template v-if="forms[activeRole.name]">
        <p v-if="activeRole.protected" class="role__protected-note">
          {{ $t('admin.roles.allPermissions') }}
        </p>

        <!-- Two-column masonry on desktop (>=1024px) for a compact overview; each
             group stays intact (break-inside: avoid). Single column on mobile. -->
        <div class="perm-groups">
          <fieldset v-for="group in permissionGroups" :key="group.name" class="perm-group">
            <legend class="perm-group__title">{{ groupLabel(group.name) }}</legend>
            <label
              v-for="permission in group.permissions"
              :key="permission.key"
              class="perm-row"
              :class="{
                'perm-row--added': hoverDiff[permission.key] === 'added',
                'perm-row--removed': hoverDiff[permission.key] === 'removed',
                'perm-row--unavailable': permission.available === false,
              }"
              :title="permission.available === false ? $t('admin.roles.permUnavailable') : null"
            >
              <input
                type="checkbox"
                :disabled="activeRole.protected || permission.available === false"
                v-model="forms[activeRole.name].permissions[permission.key]"
                :data-test="`role-${activeRole.name}-perm-${permission.key}`"
              />
              <span class="perm-row__text">
                <span class="perm-row__key">{{ permission.key }}</span>
                <span class="perm-row__desc">{{ permLabel(permission) }}</span>
                <span v-if="permission.available === false" class="perm-row__gate">
                  {{ $t('admin.roles.permUnavailable') }}
                </span>
              </span>
            </label>
          </fieldset>
        </div>

        <div class="role__actions">
          <!-- Always visible; disabled (with a hint) where the action does not apply. -->
          <span class="role__action" :title="saveHint(activeRole)">
            <os-button
              variant="primary"
              appearance="filled"
              :disabled="saveDisabled(activeRole)"
              :data-test="`role-${activeRole.name}-save`"
              @click="saveRole(activeRole)"
            >
              {{ $t('admin.roles.save') }}
            </os-button>
          </span>
          <span class="role__action" :title="deleteHint(activeRole)">
            <os-button
              variant="danger"
              appearance="ghost"
              :disabled="!canDelete(activeRole) || saving"
              :data-test="`role-${activeRole.name}-delete`"
              @click="removeRole(activeRole)"
            >
              {{ $t('admin.roles.delete') }}
            </os-button>
          </span>
        </div>
      </template>
    </section>

    <!-- Soft warning when an admin is about to strip role.manage from their own
         role (a self-lockout, recoverable only by an owner). Not a hard block —
         the owner role is the real failsafe. -->
    <confirm-modal
      v-if="showConfirmModal"
      :modalData="confirmModalData"
      @close="showConfirmModal = false"
    />
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import permissionsChangedSubscription from '~/graphql/PermissionsSubscription'
import { iconRegistry } from '~/utils/iconRegistry'
import {
  createRoleMutation,
  deleteRoleMutation,
  permissionCatalogQuery,
  renameRoleMutation,
  rolesQuery,
  updateRoleMutation,
} from '~/graphql/admin/Roles.js'

const emptyPermissionMap = (catalog) =>
  catalog.reduce((map, permission) => ({ ...map, [permission.key]: false }), {})

export default {
  components: { ConfirmModal, OsButton, OsCard },
  middleware: ['isAdmin'],
  data() {
    return {
      roles: [],
      permissionCatalog: [],
      // Editable drafts keyed by role name, rebuilt whenever roles load.
      forms: {},
      // The single role currently shown.
      activeRoleName: null,
      // The role pill currently hovered, to preview its diff against the active role.
      hoveredRoleName: null,
      // Whether the + button is in name-input mode.
      creating: false,
      newRole: { name: '' },
      // Whether the active role's name is being edited (rename mode), and its draft.
      renaming: false,
      renameValue: '',
      saving: false,
      // Confirm-modal state for the self-lockout warning (see saveRole).
      showConfirmModal: false,
      confirmModalData: null,
    }
  },
  apollo: {
    roles: {
      query: rolesQuery,
      fetchPolicy: 'cache-and-network',
      result() {
        this.buildForms()
      },
    },
    permissionCatalog: {
      query: permissionCatalogQuery,
      // cache-and-network so re-entering this route (admin tabs are separate routes via
      // <nuxt-child/>) always re-resolves `available` against the CURRENT policy/config —
      // otherwise a cache-first read shows a gate's stale state (e.g. apiKey.create still
      // greyed out right after enabling API keys on the policy tab).
      fetchPolicy: 'cache-and-network',
      // Rebuild the forms once the catalog is known — otherwise a roles result that
      // arrives first builds them against an empty catalog (owner would show no
      // checked permissions).
      result() {
        this.buildForms()
      },
    },
    // Live signal that effective permissions may have changed: a role's permission set,
    // a user's role assignment, OR a permission-gating policy toggle (e.g. apiKeysEnabled).
    // Refetch the catalog so its `available` flags and the role sets reflect it without a
    // reload; unsaved edits are preserved by buildForms.
    $subscribe: {
      permissionsChanged: {
        query: permissionsChangedSubscription(),
        result({ data }) {
          this.onPermissionsChanged(data && data.permissionsChanged)
        },
      },
    },
  },
  created() {
    this.icons = iconRegistry
    // Select a default active role from any roles already present (e.g. in tests);
    // the apollo result() re-runs this once roles load.
    this.ensureActive()
  },
  computed: {
    // Display order: lowest-privilege first (the baseline `user` group leads, the
    // protected `owner` failsafe — which has no editable settings — trails). The
    // backend returns roles broadest-first (owner → … → user); reversing reads the
    // hierarchy bottom-up, which is what the admin wants to start from.
    orderedRoles() {
      return [...this.roles].reverse()
    },
    // The role object currently selected in the switcher.
    activeRole() {
      return this.roles.find((role) => role.name === this.activeRoleName) || null
    },
    // When hovering another pill, map each permission key to how it differs from the
    // active role: 'added' (hovered role has it, active doesn't) / 'removed' (active
    // has it, hovered doesn't). Empty while hovering nothing or the active role.
    hoverDiff() {
      if (!this.hoveredRoleName || this.hoveredRoleName === this.activeRoleName) return {}
      const hovered = this.roles.find((role) => role.name === this.hoveredRoleName)
      if (!hovered) return {}
      const activeSet = this.permissionSetOf(this.activeRole)
      const hoveredSet = this.permissionSetOf(hovered)
      const diff = {}
      for (const permission of this.permissionCatalog) {
        const inActive = activeSet.has(permission.key)
        const inHovered = hoveredSet.has(permission.key)
        if (inHovered && !inActive) diff[permission.key] = 'added'
        else if (!inHovered && inActive) diff[permission.key] = 'removed'
      }
      return diff
    },
    // Catalog grouped by permission group, for sectioned checkboxes.
    permissionGroups() {
      const byGroup = {}
      for (const permission of this.permissionCatalog) {
        ;(byGroup[permission.group] = byGroup[permission.group] || []).push(permission)
      }
      return Object.keys(byGroup)
        .sort()
        .map((name) => ({ name, permissions: byGroup[name] }))
    },
  },
  methods: {
    // A permissionsChanged signal arrived: a role's permission set, a user's role
    // assignment, a permission-gating policy toggle, OR a rename (here or elsewhere).
    // On a rename, follow the selection to the new name and patch this client's cache
    // BEFORE refetching, so a viewer who had the renamed role selected keeps it (rather
    // than the refetch's stale cache emit dropping it). Then refetch to reconcile.
    onPermissionsChanged(change) {
      if (change && change.previousRoleName) {
        this.followRename(change.previousRoleName, change.roleName)
      }
      this.refreshFromServer()
    },
    // Reflect a rename that happened on this or another client: patch the roles-query
    // cache (so a cache-and-network refetch never re-serves the old name), mirror it in
    // the local list, move the selection if it was on the renamed role, and rebuild the
    // drafts so the role body keeps rendering.
    followRename(oldName, newName) {
      if (!newName || oldName === newName) return
      // If this client has the rename editor open on the very role being renamed, close it:
      // its renameValue is now stale, and confirming would submit it against the (already
      // renamed) role. Checked before the selection moves off oldName below.
      if (this.renaming && this.activeRoleName === oldName) this.cancelRename()
      // Move the selection FIRST. Patching the cache below writes the roles query, which
      // broadcasts SYNCHRONOUSLY to the roles smart-query (→ result → buildForms →
      // ensureActive). If the selection were still the old name at that point, ensureActive
      // would reset it to the first tab (the "jump to front" flash) before we could follow.
      if (this.activeRoleName === oldName) this.activeRoleName = newName
      this.patchRolesCacheRename(this.$apollo?.provider?.defaultClient, oldName, { name: newName })
      this.roles = this.roles.map((role) =>
        role.name === oldName ? { ...role, name: newName } : role,
      )
      // Carry any in-progress (unsaved) draft from the old name to the new one — forms are
      // keyed by role name, so a rename mid-edit would otherwise drop the edits. buildForms
      // then preserves it as dirty (or rebuilds it from the server when it was clean).
      if (this.forms[oldName] && !this.forms[newName]) {
        this.forms = { ...this.forms, [newName]: this.forms[oldName] }
      }
      this.buildForms()
    },
    // Refetch catalog (its `available` flags) + roles after a permissionsChanged signal.
    // Guarded with optional chaining so it is a no-op in environments without live
    // smart queries (e.g. unit mounts).
    refreshFromServer() {
      this.$apollo.queries.permissionCatalog?.refetch()
      this.$apollo.queries.roles?.refetch()
    },
    buildForms() {
      const forms = {}
      for (const role of this.roles) {
        // Preserve an editable role's draft while it has unsaved edits, so a live refetch
        // (another admin's change, or a permission-gating policy toggle) does not clobber
        // in-progress work. Protected roles are never edited → always rebuilt.
        if (!role.protected && this.forms[role.name] && this.isDirty(role)) {
          forms[role.name] = this.forms[role.name]
          continue
        }
        const permissions = emptyPermissionMap(this.permissionCatalog)
        // Protected roles (owner) hold the full catalog — shown all-checked, disabled.
        const keys = role.protected ? Object.keys(permissions) : role.permissions
        for (const key of keys) permissions[key] = true
        forms[role.name] = {
          permissions,
        }
      }
      this.forms = forms
      this.ensureActive()
    },
    // Localized label for a permission group, falling back to the raw group name.
    // vuex-i18n returns the key itself when there is no translation.
    groupLabel(group) {
      const path = `admin.roles.groups.${group}`
      const label = this.$t(path)
      return label && label !== path ? label : group
    },
    // Localized description for a permission. The catalog key is dotted, so it is
    // sanitised to a flat i18n key; falls back to the catalog's English description
    // (e.g. for a permission added before its translation exists).
    permLabel(permission) {
      const path = `admin.roles.perm.${permission.key.replace(/\./g, '_')}`
      const label = this.$t(path)
      return label && label !== path ? label : permission.description
    },
    // The effective permission key set of a role (full catalog for protected roles).
    permissionSetOf(role) {
      if (!role) return new Set()
      if (role.protected) return new Set(this.permissionCatalog.map((p) => p.key))
      return new Set(role.permissions)
    },
    // Keep a valid role selected: default to the first one shown (lowest-privilege,
    // the baseline `user` group), and re-select after a role is deleted/renamed away.
    ensureActive() {
      if (!this.roles.length) {
        this.activeRoleName = null
        return
      }
      if (!this.roles.some((role) => role.name === this.activeRoleName)) {
        // A previously-selected role vanished from the list. Don't snap to the first tab
        // on a transient stale-cache emit while a refetch is still in flight — the fresh
        // network list may still hold it (e.g. a rename following its new name). Only
        // fall back once loading has settled. The initial (null) selection is immediate.
        if (this.activeRoleName && this.$apollo?.queries?.roles?.loading) return
        this.activeRoleName = this.orderedRoles[0].name
      }
    },
    setActive(name) {
      this.activeRoleName = name
      this.cancelCreate()
      this.cancelRename()
    },
    // Mandatory roles are load-bearing by name (owner ⇒ full catalog, user ⇒ the
    // baseline fallback) and cannot be renamed — mirrors the backend guard.
    canRename(role) {
      return !role.protected && role.name !== 'user'
    },
    startRename() {
      this.creating = false
      this.renaming = true
      this.renameValue = this.activeRole.name
      this.$nextTick(() => {
        if (this.$refs.renameInput) this.$refs.renameInput.focus()
      })
    },
    cancelRename() {
      this.renaming = false
      this.renameValue = ''
    },
    // Reflect a rename in the roles-query cache so every subsequent read already carries
    // the new name — the refetch below AND the permissionsChanged-triggered refresh both
    // fetch cache-and-network, so a stale cache emit (still holding the OLD name) would
    // otherwise make ensureActive reset the selection to the first tab.
    patchRolesCacheRename(store, oldName, renamed) {
      if (!renamed) return
      let cached
      try {
        cached = store.readQuery({ query: rolesQuery })
      } catch (e) {
        // The roles query is not in the cache yet — nothing to patch.
        return
      }
      if (!cached) return
      store.writeQuery({
        query: rolesQuery,
        data: {
          roles: cached.roles.map((role) =>
            role.name === oldName ? { ...role, ...renamed } : role,
          ),
        },
      })
    },
    // Rename the active role, keeping its permissions and members. Follow the rename
    // locally (select the new name, patch the cache, rebuild drafts) via the same path as
    // a remote rename, THEN refetch. We deliberately do NOT patch the cache in the mutation
    // `update`: writeQuery there broadcasts to the roles smart-query while the selection is
    // still the old name, which resets it to the first tab (a "jump to front" flash).
    async renameRole() {
      const oldName = this.activeRole.name
      const newName = this.renameValue.trim()
      if (!newName || newName === oldName || this.saving) return
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: renameRoleMutation,
          variables: { name: oldName, newName },
        })
        this.followRename(oldName, newName)
        this.cancelRename()
        this.$toast.success(this.$t('admin.roles.renameSuccess'))
        await this.$apollo.queries.roles.refetch()
      } catch (err) {
        this.$toast.error(this.$t('admin.roles.renameError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
    startCreate() {
      this.cancelRename()
      this.creating = true
      this.newRole.name = ''
      this.$nextTick(() => {
        if (this.$refs.newRoleInput) this.$refs.newRoleInput.focus()
      })
    },
    cancelCreate() {
      this.creating = false
      this.newRole.name = ''
    },
    selectedPermissions(permissionMap) {
      return Object.keys(permissionMap).filter((key) => permissionMap[key])
    },
    isDirty(role) {
      const form = this.forms[role.name]
      if (!form) return false
      const selected = this.selectedPermissions(form.permissions).sort()
      const original = [...role.permissions].sort()
      return (
        selected.length !== original.length ||
        selected.some((key, index) => key !== original[index])
      )
    },
    canDelete(role) {
      // Protected (owner) and the implicit baseline (user) cannot be deleted, and a
      // role with members would orphan them — reassign first (enforced by the backend).
      return !role.protected && role.name !== 'user' && (role.memberCount || 0) === 0
    },
    hasMembers(role) {
      return (role.memberCount || 0) > 0
    },
    saveDisabled(role) {
      // Protected roles are read-only; otherwise save only when there are changes.
      return role.protected || !this.isDirty(role) || this.saving
    },
    saveHint(role) {
      return role.protected ? this.$t('admin.roles.protectedHint') : ''
    },
    deleteHint(role) {
      if (this.canDelete(role)) return ''
      // A role that is only undeletable because it still has members gets the
      // specific "reassign first" hint.
      if (!role.protected && role.name !== 'user' && this.hasMembers(role)) {
        return this.$t('admin.roles.cannotDeleteHasMembers')
      }
      return this.$t('admin.roles.cannotDelete')
    },
    // Would saving `role` strip role.manage from the CURRENT user's own role? In the
    // single-role model that locks the actor out of this very page — recoverable only
    // by an owner. The owner role is the hard failsafe (it always holds role.manage,
    // checkboxes disabled), so this is a soft confirm, not a block. Guarded for unit
    // tests where $store/$can are absent.
    wouldLockSelfOut(role) {
      const ownRole = this.$store?.getters?.['auth/user']?.roleName
      if (!ownRole || role.name !== ownRole) return false
      if (typeof this.$can !== 'function' || !this.$can('role.manage')) return false
      return !this.selectedPermissions(this.forms[role.name].permissions).includes('role.manage')
    },
    saveRole(role) {
      if (this.wouldLockSelfOut(role)) {
        this.confirmModalData = {
          titleIdent: 'admin.roles.selfLockout.title',
          messageIdent: 'admin.roles.selfLockout.message',
          messageParams: { role: role.name },
          buttons: {
            confirm: {
              danger: true,
              icon: this.icons.exclamationCircle,
              textIdent: 'admin.roles.selfLockout.confirm',
              callback: () => this.performSave(role),
            },
            cancel: {
              icon: this.icons.close,
              textIdent: 'actions.cancel',
              callback: () => {},
            },
          },
        }
        this.showConfirmModal = true
        return undefined
      }
      return this.performSave(role)
    },
    async performSave(role) {
      const form = this.forms[role.name]
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: updateRoleMutation,
          variables: {
            name: role.name,
            permissions: this.selectedPermissions(form.permissions),
          },
        })
        await this.$apollo.queries.roles.refetch()
        this.$toast.success(this.$t('admin.roles.saveSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.roles.saveError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
    async removeRole(role) {
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: deleteRoleMutation,
          variables: { name: role.name },
        })
        // The deleted role can no longer be active; fall back in ensureActive().
        if (this.activeRoleName === role.name) this.activeRoleName = null
        await this.$apollo.queries.roles.refetch()
        this.$toast.success(this.$t('admin.roles.deleteSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.roles.deleteError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
    // Create an empty role from the typed name, then select it so its permissions
    // can be edited and saved.
    async createRole() {
      const name = this.newRole.name.trim()
      if (!name || this.saving) return
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: createRoleMutation,
          variables: { name, permissions: [] },
        })
        await this.$apollo.queries.roles.refetch()
        this.activeRoleName = name
        this.cancelCreate()
        this.$toast.success(this.$t('admin.roles.saveSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.roles.saveError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.title {
  margin-bottom: $space-xx-small;
}
.description {
  margin-bottom: $space-base;
  color: $text-color-soft;
}
.role-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-x-small;
  padding-bottom: $space-small;
  border-bottom: 1px solid $border-color-softer;
}
.role-tab {
  display: inline-flex;
  align-items: center;
  gap: $space-xxx-small;
  padding: $space-xx-small $space-small;
  border: 1px solid $border-color-soft;
  border-radius: $border-radius-x-large;
  background: $background-color-base;
  color: $text-color-base;
  font-size: 0.9em;
  line-height: 1.4;
  cursor: pointer;

  &:hover {
    background: $background-color-softer;
  }
  &--active {
    border-color: $color-primary;
    background: $color-primary;
    color: $color-primary-inverse;
    font-weight: bold;

    &:hover {
      background: $color-primary;
    }
  }
  &--add {
    font-weight: bold;
    border-style: dashed;
  }
  &--input {
    padding: $space-xxx-small $space-xx-small;
    cursor: default;
  }
  &__badge {
    font-size: 0.8em;
  }
  &__input {
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    min-width: 8rem;
  }
  &__confirm,
  &__cancel {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0 $space-xxx-small;
    color: $text-color-soft;

    &:hover {
      color: $text-color-base;
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}
.role {
  padding-top: $space-base;
  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-small;
    // Set the role identity apart from its permission groups with a clear gap, so the
    // (possibly terse, e.g. "ra") role name reads as its own header rather than crowding
    // the first group title.
    margin-bottom: $space-base;
  }
  &__name {
    margin: 0;
  }
  // "Role:" prefix before the name, so a poorly-named role (ra, rb) still reads as the
  // role name. Softer + lighter than the name it labels.
  &__label {
    color: $text-color-soft;
    font-weight: normal;
  }
  &__badge {
    margin-left: $space-xx-small;
    font-size: 0.7em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $text-color-soft;
  }
  // Pencil affordance next to the role name; reveals the inline rename input.
  &__rename {
    margin-left: $space-xx-small;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.7em;
    color: $text-color-soft;

    &:hover {
      color: $color-primary;
    }
  }
  &__members {
    color: $text-color-soft;
    font-size: 0.85em;
    text-decoration: none;

    &:hover {
      color: $color-primary;
      text-decoration: underline;
    }
  }
  &__protected-note {
    color: $text-color-soft;
    font-style: italic;
  }
  &__actions {
    margin-top: $space-x-small;
    display: flex;
    gap: $space-small;
  }
  // Wrapper so the title hint shows even while the button inside is disabled.
  &__action {
    display: inline-flex;
  }
}
// Desktop (>=1024px): pack the permission groups into two columns for a more
// compact overview. Mobile/tablet stay single-column (the default). column-* is
// used (rather than grid/flex) so unequal-height groups fill the space tightly.
.perm-groups {
  @media #{$media-query-large} {
    column-count: 2;
    column-gap: $space-large;
  }
}
.perm-group {
  border: none;
  padding: 0;
  margin: $space-x-small 0;
  // Keep a group (title + its rows) from splitting across the two columns.
  break-inside: avoid;
  // The first group's top margin would otherwise misalign the two column tops.
  &:first-child {
    margin-top: 0;
  }

  &__title {
    color: $text-color-soft;
    font-weight: bold;
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
}
.perm-row {
  display: flex;
  align-items: flex-start;
  gap: $space-x-small;
  margin: $space-xxx-small 0;
  padding: $space-xxx-small $space-xx-small;
  border-radius: $border-radius-small;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background-color 0.1s ease;

  // Hover-diff against the active role: the hovered role would add (green) or
  // remove (red) this permission.
  &--added {
    background: rgba($color-success, 0.16);
    border-left-color: $color-success;
  }
  &--removed {
    background: rgba($color-danger, 0.16);
    border-left-color: $color-danger;
  }
  // The permission's feature is not configured/enabled: granting it has no effect,
  // so the row is dimmed and the checkbox disabled (with an explanatory note).
  &--unavailable {
    opacity: 0.6;
    cursor: not-allowed;
  }
  input:disabled {
    cursor: default;
  }

  &__text {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }
  &__key {
    font-family: monospace;
    font-size: 0.85em;
  }
  &__desc {
    color: $text-color-soft;
    font-size: 0.8em;
  }
  &__gate {
    color: $color-danger;
    font-size: 0.75em;
    font-style: italic;
  }
}
</style>

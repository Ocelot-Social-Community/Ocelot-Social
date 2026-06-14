<template>
  <os-card>
    <h2 class="title">{{ $t('admin.roles.title') }}</h2>
    <p class="description">{{ $t('admin.roles.description') }}</p>

    <!-- Role switcher: one pill per role, plus an add button that turns into a
         name input. Only the active role's permissions are shown below. -->
    <div class="role-tabs" data-test="role-tabs">
      <button
        v-for="role in roles"
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
          {{ activeRole.name }}
          <span v-if="activeRole.protected" class="role__badge">
            {{ $t('admin.roles.protected') }}
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

        <fieldset v-for="group in permissionGroups" :key="group.name" class="perm-group">
          <legend class="perm-group__title">{{ groupLabel(group.name) }}</legend>
          <label
            v-for="permission in group.permissions"
            :key="permission.key"
            class="perm-row"
            :class="{
              'perm-row--added': hoverDiff[permission.key] === 'added',
              'perm-row--removed': hoverDiff[permission.key] === 'removed',
            }"
          >
            <input
              type="checkbox"
              :disabled="activeRole.protected"
              v-model="forms[activeRole.name].permissions[permission.key]"
              :data-test="`role-${activeRole.name}-perm-${permission.key}`"
            />
            <span class="perm-row__text">
              <span class="perm-row__key">{{ permission.key }}</span>
              <span class="perm-row__desc">{{ permLabel(permission) }}</span>
            </span>
          </label>
        </fieldset>

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
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import {
  createRoleMutation,
  deleteRoleMutation,
  permissionCatalogQuery,
  rolesQuery,
  updateRoleMutation,
} from '~/graphql/admin/Roles.js'

const emptyPermissionMap = (catalog) =>
  catalog.reduce((map, permission) => ({ ...map, [permission.key]: false }), {})

export default {
  components: { OsButton, OsCard },
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
      saving: false,
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
      // Rebuild the forms once the catalog is known — otherwise a roles result that
      // arrives first builds them against an empty catalog (owner would show no
      // checked permissions).
      result() {
        this.buildForms()
      },
    },
  },
  created() {
    // Select a default active role from any roles already present (e.g. in tests);
    // the apollo result() re-runs this once roles load.
    this.ensureActive()
  },
  computed: {
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
    buildForms() {
      const forms = {}
      for (const role of this.roles) {
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
    // Keep a valid role selected: default to the first one, and re-select after a
    // role is deleted/renamed away.
    ensureActive() {
      if (!this.roles.length) {
        this.activeRoleName = null
        return
      }
      if (!this.roles.some((role) => role.name === this.activeRoleName)) {
        this.activeRoleName = this.roles[0].name
      }
    },
    setActive(name) {
      this.activeRoleName = name
      this.cancelCreate()
    },
    startCreate() {
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
    async saveRole(role) {
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
        this.$toast.success(this.$t('admin.roles.saveSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.roles.saveError', { message: err.message }))
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
  }
  &__name {
    margin: 0;
  }
  &__badge {
    margin-left: $space-xx-small;
    font-size: 0.7em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $text-color-soft;
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
.perm-group {
  border: none;
  padding: 0;
  margin: $space-x-small 0;

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
}
</style>

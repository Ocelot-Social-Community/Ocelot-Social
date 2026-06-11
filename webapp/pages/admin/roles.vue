<template>
  <os-card>
    <h2 class="title">{{ $t('admin.roles.title') }}</h2>
    <p class="description">{{ $t('admin.roles.description') }}</p>

    <!-- Existing roles -->
    <section v-for="role in roles" :key="role.name" class="role" :data-test="`role-${role.name}`">
      <header class="role__header">
        <h3 class="role__name">
          {{ role.name }}
          <span v-if="role.protected" class="role__badge">{{ $t('admin.roles.protected') }}</span>
        </h3>
        <span class="role__members">
          {{ $t('admin.roles.members', { count: role.memberCount || 0 }) }}
        </span>
      </header>

      <template v-if="role.protected">
        <p class="role__protected-note">{{ $t('admin.roles.allPermissions') }}</p>
      </template>

      <template v-else-if="forms[role.name]">
        <div class="role__meta">
          <label class="role__field">
            <span>{{ $t('admin.roles.descriptionLabel') }}</span>
            <input
              type="text"
              v-model="forms[role.name].description"
              :data-test="`role-${role.name}-description`"
            />
          </label>
          <label class="role__field role__field--rank">
            <span>{{ $t('admin.roles.rank') }}</span>
            <input type="number" step="1" v-model.number="forms[role.name].rank" />
          </label>
        </div>

        <fieldset v-for="group in permissionGroups" :key="group.name" class="perm-group">
          <legend class="perm-group__title">{{ group.name }}</legend>
          <label v-for="permission in group.permissions" :key="permission.key" class="perm-row">
            <input
              type="checkbox"
              v-model="forms[role.name].permissions[permission.key]"
              :data-test="`role-${role.name}-perm-${permission.key}`"
            />
            <span class="perm-row__text">
              <span class="perm-row__key">{{ permission.key }}</span>
              <span class="perm-row__desc">{{ permission.description }}</span>
            </span>
          </label>
        </fieldset>

        <div class="role__actions">
          <os-button
            variant="primary"
            appearance="filled"
            :disabled="!isDirty(role) || saving"
            @click="saveRole(role)"
            :data-test="`role-${role.name}-save`"
          >
            {{ $t('admin.roles.save') }}
          </os-button>
          <os-button
            v-if="canDelete(role)"
            variant="danger"
            appearance="ghost"
            :disabled="saving"
            @click="removeRole(role)"
            :data-test="`role-${role.name}-delete`"
          >
            {{ $t('admin.roles.delete') }}
          </os-button>
        </div>
      </template>
    </section>

    <!-- Create a new role -->
    <section class="role role--new" data-test="role-create">
      <h3 class="role__name">{{ $t('admin.roles.createTitle') }}</h3>
      <div class="role__meta">
        <label class="role__field">
          <span>{{ $t('admin.roles.nameLabel') }}</span>
          <input type="text" v-model="newRole.name" data-test="new-role-name" />
        </label>
        <label class="role__field">
          <span>{{ $t('admin.roles.descriptionLabel') }}</span>
          <input type="text" v-model="newRole.description" />
        </label>
        <label class="role__field role__field--rank">
          <span>{{ $t('admin.roles.rank') }}</span>
          <input type="number" step="1" v-model.number="newRole.rank" />
        </label>
      </div>

      <fieldset v-for="group in permissionGroups" :key="group.name" class="perm-group">
        <legend class="perm-group__title">{{ group.name }}</legend>
        <label v-for="permission in group.permissions" :key="permission.key" class="perm-row">
          <input type="checkbox" v-model="newRole.permissions[permission.key]" />
          <span class="perm-row__text">
            <span class="perm-row__key">{{ permission.key }}</span>
            <span class="perm-row__desc">{{ permission.description }}</span>
          </span>
        </label>
      </fieldset>

      <div class="role__actions">
        <os-button
          variant="primary"
          appearance="filled"
          :disabled="!newRole.name || saving"
          @click="createRole"
          data-test="new-role-create"
        >
          {{ $t('admin.roles.create') }}
        </os-button>
      </div>
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
      newRole: { name: '', description: '', rank: 10, permissions: {} },
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
      result() {
        this.newRole.permissions = emptyPermissionMap(this.permissionCatalog)
      },
    },
  },
  computed: {
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
        if (role.protected) continue
        const permissions = emptyPermissionMap(this.permissionCatalog)
        for (const key of role.permissions) permissions[key] = true
        forms[role.name] = {
          description: role.description || '',
          rank: role.rank,
          permissions,
        }
      }
      this.forms = forms
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
        form.description !== (role.description || '') ||
        form.rank !== role.rank ||
        selected.length !== original.length ||
        selected.some((key, index) => key !== original[index])
      )
    },
    canDelete(role) {
      // Protected (owner) and the implicit baseline (user) cannot be deleted.
      return !role.protected && role.name !== 'user'
    },
    async saveRole(role) {
      const form = this.forms[role.name]
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: updateRoleMutation,
          variables: {
            name: role.name,
            description: form.description || null,
            rank: form.rank,
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
        await this.$apollo.queries.roles.refetch()
        this.$toast.success(this.$t('admin.roles.saveSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.roles.saveError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
    async createRole() {
      this.saving = true
      try {
        await this.$apollo.mutate({
          mutation: createRoleMutation,
          variables: {
            name: this.newRole.name,
            description: this.newRole.description || null,
            rank: this.newRole.rank,
            permissions: this.selectedPermissions(this.newRole.permissions),
          },
        })
        await this.$apollo.queries.roles.refetch()
        this.newRole = {
          name: '',
          description: '',
          rank: 10,
          permissions: emptyPermissionMap(this.permissionCatalog),
        }
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
.role {
  border-top: 1px solid $border-color-softer;
  padding-top: $space-small;
  margin-top: $space-small;

  &--new {
    border-top: 2px solid $border-color-soft;
    margin-top: $space-base;
  }
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
  }
  &__protected-note {
    color: $text-color-soft;
    font-style: italic;
  }
  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: $space-small;
    margin: $space-x-small 0;
  }
  &__field {
    display: flex;
    flex-direction: column;
    font-size: 0.85em;

    &--rank {
      max-width: 6em;
    }
  }
  &__actions {
    margin-top: $space-x-small;
    display: flex;
    gap: $space-small;
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
  cursor: pointer;

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

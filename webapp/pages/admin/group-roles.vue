<template>
  <os-card>
    <h2 class="title">{{ $t('admin.groupRoles.title') }}</h2>
    <p class="description">{{ $t('admin.groupRoles.description') }}</p>

    <div class="type-tabs">
      <button
        v-for="template in templates"
        :key="template.groupType"
        type="button"
        class="type-tab"
        :class="{ 'type-tab--active': template.groupType === activeType }"
        :data-test="`type-tab-${template.groupType}`"
        @click="activeType = template.groupType"
      >
        {{ $t(`group.types.${template.groupType}`) }}
      </button>
    </div>

    <template v-if="activeTemplate">
      <p class="untouched" data-test="untouched">
        {{
          $t('admin.groupRoles.untouched', {
            untouched: activeTemplate.untouchedGroupCount,
            total: activeTemplate.groupCount,
          })
        }}
      </p>

      <div class="role-tabs">
        <button
          v-for="role in orderedRoles"
          :key="role.name"
          type="button"
          class="role-tab"
          :class="{ 'role-tab--active': role.name === activeRoleName }"
          :data-test="`role-tab-${role.name}`"
          @click="activeRoleName = role.name"
          @mouseenter="hoveredRoleName = role.name"
          @mouseleave="hoveredRoleName = null"
        >
          {{ role.label || role.name }}
        </button>
      </div>

      <p v-if="activeRole && activeRole.protected" class="note" data-test="owner-note">
        {{ $t('admin.groupRoles.ownerHoldsEverything') }}
      </p>

      <div v-else-if="activeRole" class="perm-groups">
        <fieldset v-for="group in catalogGroups" :key="group.name" class="perm-group">
          <legend>{{ $t(`group.rights.groups.${group.name}`) }}</legend>
          <label
            v-for="permission in group.permissions"
            :key="permission.key"
            class="perm-row"
            :class="{
              'perm-row--added': rowDiff(permission.key) === 'added',
              'perm-row--removed': rowDiff(permission.key) === 'removed',
            }"
          >
            <input
              type="checkbox"
              :checked="draft.includes(permission.key)"
              :disabled="saving"
              :data-test="`perm-${permission.key}`"
              @change="toggle(permission.key, $event.target.checked)"
            />
            <span class="perm-row__key">{{ permission.key }}</span>
            <span class="perm-row__description">{{ permission.description }}</span>
          </label>
        </fieldset>
      </div>

      <div class="actions">
        <os-button :disabled="!dirty || saving" data-test="save" @click="save">
          {{ $t('actions.save') }}
        </os-button>
        <os-button :disabled="!dirty || saving" data-test="revert" @click="resetDraft">
          {{ $t('actions.cancel') }}
        </os-button>
        <!-- A template change reaches existing groups only when an admin asks for it, and then
             only the groups that never edited their own roles (concept E12). -->
        <os-button
          :disabled="saving || !activeTemplate.untouchedGroupCount"
          data-test="apply"
          @click="confirmApply"
        >
          {{ $t('admin.groupRoles.apply') }}
        </os-button>
      </div>
    </template>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'

import {
  applyGroupRoleTemplatesMutation,
  groupRoleTemplatesQuery,
  updateGroupRoleTemplateMutation,
} from '~/graphql/adminGroups.js'
import { orderRolesByPrivilege } from '~/utils/groupRights'

export default {
  components: { OsButton, OsCard },
  data() {
    return {
      catalog: [],
      templates: [],
      activeType: 'public',
      activeRoleName: 'usual',
      // The role tab currently under the cursor, to preview its rights against the one being
      // edited — the same affordance the network roles page has.
      hoveredRoleName: null,
      draft: [],
      saving: false,
    }
  },
  computed: {
    activeTemplate() {
      return this.templates.find((template) => template.groupType === this.activeType) ?? null
    },
    activeRole() {
      return this.activeTemplate?.roles.find((role) => role.name === this.activeRoleName) ?? null
    },
    // Least privileged first, like everywhere else roles are listed: outsider, applicant,
    // member, whatever the template adds, owner.
    orderedRoles() {
      return orderRolesByPrivilege(this.activeTemplate?.roles ?? [])
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
      return [...this.activeRole.permissions].sort().join(',') !== [...this.draft].sort().join(',')
    },
    // Hovering another role marks every right it would change: 'added' where the hovered role
    // grants what this one does not, 'removed' the other way round. Compared against the
    // DRAFT, so an unsaved edit is part of the comparison rather than ignored by it.
    hoverDiff() {
      if (!this.hoveredRoleName || this.hoveredRoleName === this.activeRoleName) return {}
      const hovered = this.activeTemplate?.roles.find((role) => role.name === this.hoveredRoleName)
      if (!hovered) return {}
      const hoveredSet = this.permissionSetOf(hovered)
      const activeSet = new Set(this.draft)
      const diff = {}
      for (const permission of this.catalog) {
        const inHovered = hoveredSet.has(permission.key)
        const inActive = activeSet.has(permission.key)
        if (inHovered && !inActive) diff[permission.key] = 'added'
        else if (!inHovered && inActive) diff[permission.key] = 'removed'
      }
      return diff
    },
  },
  watch: {
    activeType() {
      this.resetDraft()
    },
    activeRoleName() {
      this.resetDraft()
    },
  },
  methods: {
    resetDraft() {
      this.draft = this.activeRole ? [...this.activeRole.permissions] : []
    },
    // The rights a role effectively holds. `owner` stores no list and resolves to the whole
    // catalog — hovering it has to show that, not an empty role.
    permissionSetOf(role) {
      if (!role) return new Set()
      if (role.protected) return new Set(this.catalog.map((permission) => permission.key))
      return new Set(role.permissions)
    },
    rowDiff(key) {
      return this.hoverDiff[key] ?? null
    },
    toggle(key, enabled) {
      this.draft = enabled ? [...this.draft, key] : this.draft.filter((k) => k !== key)
    },
    async save() {
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: updateGroupRoleTemplateMutation(),
          variables: {
            groupType: this.activeType,
            name: this.activeRoleName,
            permissions: this.draft,
            label: this.activeRole?.label ?? null,
          },
        })
        this.mergeRole(data.updateGroupRoleTemplate)
        this.$toast.success(this.$t('admin.groupRoles.saved'))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
    mergeRole(role) {
      this.templates = this.templates.map((template) =>
        template.groupType === this.activeType
          ? {
              ...template,
              roles: template.roles.map((candidate) =>
                candidate.name === role.name ? role : candidate,
              ),
            }
          : template,
      )
      this.resetDraft()
    },
    async confirmApply() {
      if (
        !window.confirm(
          this.$t('admin.groupRoles.confirmApply', {
            count: this.activeTemplate.untouchedGroupCount,
          }),
        )
      ) {
        return
      }
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({ mutation: applyGroupRoleTemplatesMutation() })
        this.$toast.success(
          this.$t('admin.groupRoles.applied', { count: data.applyGroupRoleTemplates }),
        )
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
  },
  apollo: {
    templatesQuery: {
      query() {
        return groupRoleTemplatesQuery()
      },
      manual: true,
      result({ data, loading }) {
        if (loading || !data) return
        this.catalog = data.groupPermissionCatalog ?? []
        this.templates = data.groupRoleTemplates ?? []
        this.resetDraft()
      },
      error(error) {
        this.$toast.error(error.message)
      },
    },
  },
}
</script>

<style scoped>
.title {
  margin-bottom: 0;
}
.description,
.untouched,
.note {
  color: var(--text-color-soft);
}
.type-tabs,
.role-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xx-small);
  margin-bottom: var(--space-small);
}
.type-tab,
.role-tab {
  border: 1px solid var(--border-color-softer);
  border-radius: var(--border-radius-base);
  background: var(--background-color-softest);
  padding: var(--space-xx-small) var(--space-x-small);
  cursor: pointer;
}
.type-tab--active,
.role-tab--active {
  border-color: var(--color-primary);
  font-weight: bold;
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
  /* The left border carries the hover-diff colour below, so it is reserved here rather than
     added with the modifier — otherwise every marked row would shift sideways. */
  padding: var(--space-xxx-small) var(--space-xx-small);
  border-radius: var(--border-radius-small);
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.perm-row--added {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  border-left-color: var(--color-success);
}

.perm-row--removed {
  background: color-mix(in srgb, var(--color-danger) 16%, transparent);
  border-left-color: var(--color-danger);
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
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  margin-top: var(--space-base);
}
</style>

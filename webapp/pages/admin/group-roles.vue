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
        {{ $t('admin.groupRoles.untouched', { count: activeTemplate.untouchedGroupCount }) }}
      </p>

      <div class="role-tabs">
        <button
          v-for="role in activeTemplate.roles"
          :key="role.name"
          type="button"
          class="role-tab"
          :class="{ 'role-tab--active': role.name === activeRoleName }"
          :data-test="`role-tab-${role.name}`"
          @click="activeRoleName = role.name"
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
          <label v-for="permission in group.permissions" :key="permission.key" class="perm-row">
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

export default {
  components: { OsButton, OsCard },
  data() {
    return {
      catalog: [],
      templates: [],
      activeType: 'public',
      activeRoleName: 'usual',
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
  padding: var(--space-xxx-small) 0;
  cursor: pointer;
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

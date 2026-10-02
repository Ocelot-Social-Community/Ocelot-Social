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
        @mouseenter="hoveredType = template.groupType"
        @mouseleave="hoveredType = null"
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

      <role-tabs
        :roles="orderedRoles"
        :active-name="activeRoleName"
        :label-for="(role) => role.label || role.name"
        :badge-title="$t('admin.groupRoles.ownerHoldsEverything')"
        @select="activeRoleName = $event"
        @hover="hoveredRoleName = $event"
      />

      <label v-if="activeRole" class="role-label" data-test="role-label">
        {{ $t('admin.groupRoles.labelField') }}
        <input
          v-model="draftLabel"
          type="text"
          :placeholder="activeRole.name"
          :disabled="saving"
          data-test="role-label-input"
        />
      </label>

      <p v-if="activeRole && activeRole.protected" class="note" data-test="owner-note">
        {{ $t('admin.groupRoles.ownerHoldsEverything') }}
      </p>

      <permission-matrix
        v-else-if="activeRole"
        :permissions="catalog"
        :granted="draft"
        :diff="hoverDiff"
        :group-label="(name) => $t(`group.rights.groups.${name}`)"
        :disabled-for="(permission) => saving || isMandatory(permission)"
        :hint-for="(permission) => (isMandatory(permission) ? $t('group.rights.mandatory') : null)"
        @toggle="toggle"
      />

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
import PermissionMatrix from '~/components/Permissions/PermissionMatrix'
import RoleTabs from '~/components/Permissions/RoleTabs'

import {
  applyGroupRoleTemplatesMutation,
  groupRoleTemplatesQuery,
  updateGroupRoleTemplateMutation,
} from '~/graphql/adminGroups.js'
import { MANDATORY_GROUP_RIGHTS, NONE_GROUP_ROLE } from '~/constants/groups'
import { orderRolesByPrivilege } from '~/utils/groupRights'

export default {
  components: { OsButton, OsCard, PermissionMatrix, RoleTabs },
  data() {
    return {
      catalog: [],
      templates: [],
      activeType: 'public',
      activeRoleName: 'usual',
      // The TYPE tab under the cursor: hovering `closed` while editing the public template's
      // member role previews what a closed group's member role does differently — the question
      // these three presets exist to answer.
      hoveredType: null,
      // The role tab currently under the cursor, to preview its rights against the one being
      // edited — the same affordance the network roles page has.
      hoveredRoleName: null,
      draft: [],
      // The label a group role carries network-wide. Every new group copies it, which is what
      // makes renaming `usual` to "Mitglied" here a one-place change rather than a per-group
      // chore — and the owner role, whose rights are fixed, has nothing BUT its name to edit.
      draftLabel: '',
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
    dirty() {
      if (!this.activeRole) return false
      const stored = [...this.activeRole.permissions].sort().join(',')
      const draft = [...this.draft].sort().join(',')
      return stored !== draft || (this.activeRole.label ?? '') !== this.draftLabel
    },
    /**
     * What the cursor is previewing, or null: ANOTHER ROLE of this template, or the SAME role
     * in another type's template. Two hovers, one comparison — the rows can only mark one
     * difference at a time, and a type hover is the more specific of the two.
     */
    hoveredRole() {
      if (this.hoveredType && this.hoveredType !== this.activeType) {
        return (
          this.templates
            .find((template) => template.groupType === this.hoveredType)
            ?.roles.find((role) => role.name === this.activeRoleName) ?? null
        )
      }
      if (this.hoveredRoleName && this.hoveredRoleName !== this.activeRoleName) {
        return this.activeTemplate?.roles.find((role) => role.name === this.hoveredRoleName) ?? null
      }
      return null
    },
    // Every right the preview would change: 'added' where it grants what the edited role does
    // not, 'removed' the other way round. Compared against the DRAFT, so an unsaved edit is
    // part of the comparison rather than ignored by it.
    hoverDiff() {
      if (!this.hoveredRole) return {}
      const hoveredSet = this.permissionSetOf(this.hoveredRole)
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
      this.draftLabel = this.activeRole?.label ?? ''
    },
    // The rights a role effectively holds. `owner` stores no list and resolves to the whole
    // catalog — hovering it has to show that, not an empty role.
    permissionSetOf(role) {
      if (!role) return new Set()
      if (role.protected) return new Set(this.catalog.map((permission) => permission.key))
      return new Set(role.permissions)
    },
    // Ticked and locked: a membership role cannot be stored without the right to end the
    // membership (see groupRole/mandatoryRights.ts).
    isMandatory(permission) {
      return (
        this.activeRoleName !== NONE_GROUP_ROLE && MANDATORY_GROUP_RIGHTS.includes(permission?.key)
      )
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
            label: this.draftLabel || null,
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
.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xx-small);
  margin-bottom: var(--space-small);
}
.type-tab {
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-x-large);
  background: var(--background-color-base);
  padding: var(--space-xx-small) var(--space-small);
  font-size: 0.9em;
  cursor: pointer;
}
.type-tab:hover {
  background: var(--background-color-softer);
}
.type-tab--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  font-weight: bold;
}
.role-label {
  display: flex;
  gap: var(--space-x-small);
  align-items: baseline;
  margin: var(--space-small) 0;
  color: var(--text-color-soft);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  margin-top: var(--space-base);
}
</style>

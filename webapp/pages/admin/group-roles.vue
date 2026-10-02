<template>
  <os-card>
    <h2 class="title">{{ $t('admin.groupRoles.title') }}</h2>
    <p class="description">{{ $t('admin.groupRoles.description') }}</p>

    <!-- One tab per TEMPLATE. What a template is CALLED and how findable the groups it creates
         are are two different things that used to share one vocabulary — the tab said "Public"
         and the line below said the groups are "Public", and the two can disagree the moment
         somebody edits the template's non-member role. The row is labelled as templates, and
         the visibility is stated below as a consequence. -->
    <div class="type-tabs">
      <span class="type-tabs__label">{{ $t('admin.groupRoles.templateLabel') }}</span>
      <button
        v-for="template in templates"
        :key="template.name"
        type="button"
        class="type-tab"
        :class="{ 'type-tab--active': template.name === activeTemplateName }"
        :data-test="`type-tab-${template.name}`"
        @click="activeTemplateName = template.name"
        @mouseenter="hoveredTemplateName = template.name"
        @mouseleave="hoveredTemplateName = null"
      >
        {{ $t(`group.types.${template.name}`) }}
      </button>
    </div>

    <template v-if="activeTemplate">
      <!-- The same card and the same switches a group gets for its own rights, so a template is
           read the way the thing it produces is read. -->
      <group-rights-simple
        :roles="activeTemplate.roles"
        :catalog="catalog"
        :caption="$t('admin.groupRoles.resultingVisibility')"
        :disabled="saving || dirty"
        :disabled-hint="$t('admin.groupRoles.saveFirst')"
        @toggle="toggleSimple"
      />

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

      <ocelot-input
        v-if="activeRole"
        v-model="draftLabel"
        class="role-label"
        :label="$t('admin.groupRoles.labelField')"
        :placeholder="activeRole.name"
        :disabled="saving"
        data-test="role-label"
      />

      <p v-if="activeRole && activeRole.protected" class="note" data-test="owner-note">
        {{ $t('admin.groupRoles.ownerHoldsEverything') }}
      </p>

      <permission-matrix
        v-else-if="activeRole"
        :permissions="catalog"
        :granted="draft"
        :diff="hoverDiff"
        :group-label="(name) => $t(`permissions.sections.${name}`)"
        :disabled-for="(permission) => saving || isMandatory(permission) || isMoot(permission)"
        :hint-for="
          (permission) =>
            isMoot(permission)
              ? $t('group.rights.moot')
              : isMandatory(permission)
                ? $t('group.rights.mandatory')
                : null
        "
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
import GroupRightsSimple from '~/components/Permissions/GroupRightsSimple'
import OcelotInput from '~/components/OcelotInput/OcelotInput'
import PermissionMatrix from '~/components/Permissions/PermissionMatrix'
import RoleTabs from '~/components/Permissions/RoleTabs'

import {
  applyGroupRoleTemplatesMutation,
  groupRoleTemplatesQuery,
  updateGroupRoleTemplateMutation,
} from '~/graphql/adminGroups.js'
import { MANDATORY_GROUP_RIGHTS, NONE_GROUP_ROLE } from '~/constants/groups'
import { orderRolesByPrivilege } from '~/utils/groupRights'
import { diffBetween, isRoleDirty, permissionSetOf } from '~/utils/permissionDiff'

export default {
  components: { GroupRightsSimple, OcelotInput, OsButton, OsCard, PermissionMatrix, RoleTabs },
  data() {
    return {
      catalog: [],
      templates: [],
      activeTemplateName: 'public',
      activeRoleName: 'usual',
      // The TEMPLATE tab under the cursor: hovering `closed` while editing the public one's
      // member role previews what a closed group's member role does differently — the question
      // these three presets exist to answer.
      hoveredTemplateName: null,
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
      return this.templates.find((template) => template.name === this.activeTemplateName) ?? null
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
      return isRoleDirty(this.activeRole, this.draft, this.draftLabel)
    },
    /**
     * What the cursor is previewing, or null: ANOTHER ROLE of this template, or the SAME role
     * in another type's template. Two hovers, one comparison — the rows can only mark one
     * difference at a time, and a type hover is the more specific of the two.
     */
    hoveredRole() {
      if (this.hoveredTemplateName && this.hoveredTemplateName !== this.activeTemplateName) {
        return (
          this.templates
            .find((template) => template.name === this.hoveredTemplateName)
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
      return diffBetween(this.catalog, new Set(this.draft), this.permissionSetOf(this.hoveredRole))
    },
  },
  watch: {
    activeTemplateName() {
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
      return permissionSetOf(role, this.catalog)
    },
    // Ticked and locked: a membership role cannot be stored without the right to end the
    // membership (see groupRole/mandatoryRights.ts).
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
      return (
        this.activeRoleName !== NONE_GROUP_ROLE && MANDATORY_GROUP_RIGHTS.includes(permission?.key)
      )
    },
    toggle(key, enabled) {
      this.draft = enabled ? [...this.draft, key] : this.draft.filter((k) => k !== key)
    },
    save() {
      return this.writeRole(this.activeRoleName, this.draft, this.draftLabel || null)
    },
    /**
     * One tick in the simple view writes one role of this template straight away — the same
     * immediacy a group's own simple view has. The matrix keeps its draft-and-save flow, which
     * is why the switches are locked while that draft is dirty: saving a role here would
     * otherwise discard the edit in progress without saying so.
     */
    toggleSimple(roleName, permissionKey, enabled) {
      const role = this.activeTemplate?.roles.find((candidate) => candidate.name === roleName)
      if (!role) return
      const permissions = enabled
        ? [...role.permissions, permissionKey]
        : role.permissions.filter((key) => key !== permissionKey)
      return this.writeRole(role.name, permissions, role.label ?? null)
    },
    async writeRole(name, permissions, label) {
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: updateGroupRoleTemplateMutation(),
          variables: { template: this.activeTemplateName, name, permissions, label },
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
        template.name === this.activeTemplateName
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
  align-items: center;
  gap: var(--space-xx-small);
  margin-bottom: var(--space-small);
}
/* Names what the row IS, so the three short words are read as presets rather than as the
   visibility they happen to share their names with. */
.type-tabs__label {
  margin-right: var(--space-xx-small);
  color: var(--text-color-softer);
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
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
/* The hover rule above would otherwise lighten the ACTIVE tab's background while its text
   stays the inverse colour — white on near-white, unreadable. */
.type-tab--active:hover {
  background: var(--color-primary);
}
.role-label {
  max-width: 24rem;
  margin: var(--space-small) 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  margin-top: var(--space-base);
}
</style>

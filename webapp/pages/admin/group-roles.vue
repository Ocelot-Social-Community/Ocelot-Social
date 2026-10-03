<template>
  <os-card>
    <h2 class="title">{{ $t('admin.groupRoles.title') }}</h2>
    <p class="description">{{ $t('admin.groupRoles.description') }}</p>

    <template v-if="activeTemplate">
      <!-- The same card and the same switches a group gets for its own rights, so a template is
           read the way the thing it produces is read. -->
      <group-rights-simple
        :roles="rolesForSimple"
        :catalog="catalog"
        :caption="$t('admin.groupRoles.resultingVisibility')"
        :disabled="saving || dirty"
        :disabled-hint="$t('group.rights.saveFirst')"
        @save="saveSimple"
        @dirty="simpleDirty = $event"
        @highlight="switchHighlight = $event"
      >
        <template #visibility-control>
          <!-- One tab per TEMPLATE. What a template is CALLED and how findable the groups it creates
             are are two different things that used to share one vocabulary — the tab said "Public"
             and the line below said the groups are "Public", and the two can disagree the moment
             somebody edits the template's non-member role. The row is labelled as templates, and
             the visibility is stated below as a consequence. -->
          <div class="type-tabs">
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
        </template>

        <template #actions>
          <!-- No guard on the way IN: the card stays on screen, so unfolding the matrix can no
               longer throw its draft away. -->
          <button
            v-if="!advanced"
            type="button"
            class="link-button"
            data-test="to-advanced"
            @click="advanced = true"
          >
            {{ $t('group.rights.toAdvanced') }}
          </button>
        </template>
      </group-rights-simple>

      <!--
        Its own block with a rule above it and a heading that NAMES the template: the tabs below
        are the roles of the one picked at the top, and with the matrix standing loose under the
        card there was nothing on screen saying which template a tick was changing.
      -->
      <section v-if="advanced" class="advanced" data-test="advanced">
        <h3 class="advanced__title">{{ $t('group.rights.advancedTitle') }}</h3>
        <p class="advanced__subject" data-test="editing-template">
          {{
            $t('admin.groupRoles.editingTemplate', {
              template: $t(`group.types.${activeTemplateName}`),
            })
          }}
        </p>

        <role-tabs
          :roles="orderedRoles"
          :active-name="activeRoleName"
          :label-for="roleLabel"
          :badge-for="(role) => isSystemGroupRole(role.name)"
          :blocked-for="blockedRole"
          :highlight-for="highlightsRole"
          :badge-title="$t('group.rights.systemRole')"
          @select="activeRoleName = $event"
          @hover="hoveredRoleName = $event"
        />

        <ocelot-input
          v-if="activeRole"
          v-model="draftLabel"
          class="role-label"
          :label="$t('admin.groupRoles.labelField')"
          :placeholder="roleLabel({ name: activeRole.name })"
          :disabled="saving"
          data-test="role-label"
        />

        <p v-if="pendingUnreachable" class="note" data-test="pending-unreachable">
          {{ $t('group.rights.pendingUnreachable') }}
        </p>

        <p v-if="activeRole && activeRole.protected" class="note" data-test="owner-note">
          {{ $t('admin.groupRoles.ownerHoldsEverything') }}
        </p>

        <permission-matrix
          v-else-if="activeRole"
          :permissions="catalog"
          :granted="draft"
          :diff="hoverDiff"
          :highlight="highlightedRights"
          :group-label="(name) => $t(`permissions.sections.${name}`)"
          :disabled-for="
            (permission) => saving || simpleDirty || isMandatory(permission) || isMoot(permission)
          "
          :hint-for="blockedHint"
          :note-for="blockedHint"
          @toggle="toggle"
        />

        <div class="actions">
          <os-button :disabled="!dirty || saving || simpleDirty" data-test="save" @click="save">
            {{ $t('actions.save') }}
          </os-button>
          <os-button :disabled="!dirty || saving" data-test="revert" @click="resetDraft">
            {{ $t('actions.cancel') }}
          </os-button>
          <button
            type="button"
            class="link-button"
            :disabled="dirty"
            :title="dirty ? $t('group.rights.saveFirst') : null"
            data-test="to-simple"
            @click="advanced = false"
          >
            {{ $t('group.rights.hideAdvanced') }}
          </button>
        </div>
      </section>

      <!--
        The one control on this page that reaches existing groups, with the sentence that says how
        far it reaches — set apart from Save and Cancel, which only ever write the template.
        Standing in the same row, it read as a third way of saving the same edit; standing above
        the matrix, it sat between an edit and the button that stores it. Last on the page, so
        whatever is unfolded, this stays the thing one reaches after everything else.
      -->
      <section class="apply">
        <p class="untouched" data-test="untouched">
          {{
            $t('admin.groupRoles.untouched', {
              untouched: activeTemplate.untouchedGroupCount,
              total: activeTemplate.groupCount,
            })
          }}
        </p>
        <!-- A template change reaches existing groups only when an admin asks for it, and then
             only the groups that never edited their own roles (concept E12). -->
        <os-button
          :disabled="saving || simpleDirty || dirty || !activeTemplate.untouchedGroupCount"
          data-test="apply"
          @click="confirmApply"
        >
          {{ $t('admin.groupRoles.apply') }}
        </os-button>
      </section>
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
import groupRightsEditor from '~/mixins/groupRightsEditor'
import { samePermissions } from '~/utils/permissionDiff'

export default {
  mixins: [groupRightsEditor],
  components: { GroupRightsSimple, OcelotInput, OsButton, OsCard, PermissionMatrix, RoleTabs },
  data() {
    return {
      templates: [],
      activeTemplateName: 'public',
      // The TEMPLATE tab under the cursor: hovering `closed` while editing the public one's
      // member role previews what a closed group's member role does differently — the question
      // these presets exist to answer.
      hoveredTemplateName: null,
    }
  },
  computed: {
    activeTemplate() {
      return this.templates.find((template) => template.name === this.activeTemplateName) ?? null
    },
    /** What this screen edits: the roles of the template picked at the top. */
    editedRoles() {
      return this.activeTemplate?.roles ?? []
    },
    /**
     * What the cursor is previewing, or null: ANOTHER ROLE of this template, or the SAME role
     * in another template. Two hovers, one comparison — the rows can only mark one difference
     * at a time, and a template hover is the more specific of the two.
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
        return this.editedRoles.find((role) => role.name === this.hoveredRoleName) ?? null
      }
      return null
    },
    /**
     * What the matrix and the role tabs should point at: a sentence under the cursor, else the
     * roles a hovered TEMPLATE would change. Both answer "what does this control reach", and the
     * mark can only carry one answer — the sentence is the more specific of the two, so it wins.
     */
    highlight() {
      return this.switchHighlight ?? this.templateHighlight
    },
    /**
     * Every role the hovered template holds differently from the one being edited. Rights are
     * left out: the matrix already paints those green and red through `hoverDiff`, and a role
     * only has to be findable in the row of tabs.
     */
    templateHighlight() {
      const hovered = this.templates.find((template) => template.name === this.hoveredTemplateName)
      if (!hovered || hovered.name === this.activeTemplateName) return null
      const marked = {}
      for (const role of this.editedRoles) {
        const other = hovered.roles.find((candidate) => candidate.name === role.name)
        if (!other || !samePermissions(role.permissions, other.permissions)) {
          marked[role.name] = []
        }
      }
      return marked
    },
  },
  watch: {
    activeTemplateName() {
      this.resetDraft()
    },
  },
  methods: {
    save() {
      return this.writeRole(this.activeRoleName, this.draft, this.draftLabel || null)
    },
    /**
     * The sentences' draft, written in one go.
     *
     * Sequentially rather than in parallel: each write answers with the role it stored and
     * `mergeRole` folds it back in, and two answers landing at once would have the second
     * overwrite the list the first just produced.
     */
    async saveSimple(changes) {
      for (const change of changes) {
        const role = this.editedRoles.find((candidate) => candidate.name === change.name)
        if (!role) continue
        await this.writeRole(role.name, change.permissions, role.label ?? null)
      }
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
.advanced {
  margin-top: var(--space-large);
  padding-top: var(--space-base);
  border-top: 1px solid var(--border-color-softer);
}

.advanced__title {
  margin: 0;
}

.advanced__subject {
  margin: 0 0 var(--space-base);
  color: var(--text-color-soft);
}

/* Its own block with a rule above it: this is the only button here that changes a GROUP. */
.apply {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-small);
  margin-top: var(--space-base);
  padding-top: var(--space-small);
  border-top: 1px solid var(--border-color-softer);
}

.untouched {
  flex: 1 1 20rem;
  margin: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  margin-top: var(--space-base);
}
</style>

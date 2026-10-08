<template>
  <os-card>
    <h2 class="title">{{ $t('admin.groupRoles.title') }}</h2>
    <p class="description">{{ $t('admin.groupRoles.description') }}</p>

    <template v-if="activeTemplate">
      <!-- The same card and the same switches a group gets for its own rights, so a template is
           read the way the thing it produces is read. -->
      <group-rights-simple
        :roles="draftedRoles"
        :catalog="catalog"
        :caption="$t('admin.groupRoles.resultingVisibility')"
        :disabled="saving"
        :preview="previewRoles"
        @change="changeRole"
        @highlight="switchHighlight = $event"
      >
        <template #template-control>
          <!-- One tab per TEMPLATE. What a template is CALLED and how findable the groups it creates
             are are two different things that used to share one vocabulary — the tab said "Public"
             and the line below said the groups are "Public", and the two can disagree the moment
             somebody edits the template's non-member role. The row is labelled as templates, and
             the visibility is stated below as a consequence. Manual activation: picking one may
             ask to discard a draft, and the arrow keys must not raise that dialog on every step. -->
          <os-toggle-group
            :options="templateOptions"
            activation="manual"
            :value="activeTemplateName"
            :label="$t('admin.groupRoles.templateLabel')"
            @select="openTemplate"
            @hover="hoveredTemplateName = $event"
          />
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
          :drafted-for="isRoleDrafted"
          :drafted-title="$t('group.rights.drafted')"
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
          :disabled-for="rowDisabled"
          :hint-for="blockedHint"
          :note-for="blockedHint"
          @toggle="toggle"
          @hover="hoveredRight = $event"
        />
      </section>

      <!-- One draft, so one Save: under whatever is unfolded, after everything it writes. -->
      <div class="actions">
        <os-button :disabled="!dirty || saving" data-test="save" @click="save">
          {{ $t('actions.save') }}
        </os-button>
        <os-button :disabled="!dirty || saving" data-test="revert" @click="resetDraft">
          {{ $t('actions.cancel') }}
        </os-button>
        <button
          type="button"
          class="link-button"
          :data-test="advanced ? 'to-simple' : 'to-advanced'"
          @click="advanced = !advanced"
        >
          {{ advanced ? $t('group.rights.hideAdvanced') : $t('group.rights.toAdvanced') }}
        </button>
      </div>

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
        <!-- It writes what is STORED, so an unsaved draft would not travel with it. -->
        <os-button
          :disabled="saving || dirty || !activeTemplate.untouchedGroupCount"
          :title="dirty ? $t('group.rights.saveFirst') : null"
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
import { OsButton, OsCard, OsToggleGroup } from '@ocelot-social/ui'
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

export default {
  mixins: [groupRightsEditor],
  components: {
    GroupRightsSimple,
    OcelotInput,
    OsButton,
    OsCard,
    PermissionMatrix,
    RoleTabs,
    OsToggleGroup,
  },
  data() {
    return {
      templates: [],
      activeTemplateName: 'public',
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
    savedMessage() {
      return 'admin.groupRoles.saved'
    },
    templateOptions() {
      return this.templates.map((template) => ({
        value: template.name,
        label: this.$t(`group.types.${template.name}`),
        attrs: { 'data-test': `type-tab-${template.name}` },
      }))
    },
  },
  methods: {
    /** Another template's roles replace the ones on screen — and with them, the draft of these. */
    openTemplate(name) {
      if (name === this.activeTemplateName || !this.mayDiscardDraft()) return
      this.resetDraft()
      this.activeTemplateName = name
    },
    rowDisabled(permission) {
      return this.saving || this.isMandatory(permission) || this.isMoot(permission)
    },
    async storeRole(name, permissions, label) {
      const { data } = await this.$apollo.mutate({
        mutation: updateGroupRoleTemplateMutation(),
        variables: { template: this.activeTemplateName, name, permissions, label },
      })
      return data.updateGroupRoleTemplate
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
        this.$toastBackendError(error)
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
        this.$toastBackendError(error)
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

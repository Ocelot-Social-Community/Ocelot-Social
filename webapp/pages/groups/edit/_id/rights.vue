<template>
  <os-card>
    <h2 class="title">{{ $t('group.rights.title') }}</h2>
    <p class="description">{{ $t('group.rights.description') }}</p>

    <!-- The handful of questions a group actually asks itself, as sentences, with what those
         answers MAKE the group above them. Always on screen: the matrix below is an EXPANSION of
         it, not a different page — which is what lets a hovered sentence point at the rows it
         stands for. -->
    <section data-test="rights-simple">
      <group-rights-simple
        :roles="draftedRoles"
        :catalog="catalog"
        :caption="$t('group.rights.resultingType')"
        :disabled="!canEdit"
        :disabled-hint="canManageRoles ? null : $t('group.rights.noRight')"
        :grantable="grantable"
        :hint-for="blockedHint"
        :preview="previewRoles"
        @change="changeRole"
        @highlight="switchHighlight = $event"
      >
        <!--
          The same presets the admin area edits, offered where a group picks one. "Turn this
          into a channel" used to be a button here that silently took two rights off the member
          role; a channel is a template now, so the choice is visible before and recognisable
          after — and hovering one shows what it would change, before anything is replaced.
        -->
        <template #template-control>
          <div :title="$t('group.rights.applyTemplate')">
            <!-- Manual activation: picking one asks to replace every role, and the arrow keys
                 must not raise that dialog on every step. -->
            <os-toggle-group
              :options="templateOptions"
              activation="manual"
              :value="currentTemplate"
              :label="$t('admin.groupRoles.templateLabel')"
              @select="confirmApplyTemplate"
              @hover="hoveredTemplateName = $event"
            />
          </div>
        </template>
      </group-rights-simple>
    </section>

    <!-- The full matrix, one tab per role, under the sentences rather than instead of them. Both
         edit the same draft, so a tick here shows up above straight away, and a hovered row
         points at the sentence and the state it decides. -->
    <section v-if="advanced" class="advanced" data-test="rights-advanced">
      <h3 class="advanced__title">{{ $t('group.rights.advancedTitle') }}</h3>

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

      <!-- No "add a role" here: a group defining its own roles is parked (#10356), the server
           refuses it, and a button that is refused is worse than no button. The five system
           roles are the whole vocabulary for now. -->

      <template v-if="activeRole">
        <header class="role-header">
          <!-- Also for the owner role: its RIGHTS cannot be edited (it holds the catalog), but
               its name can — "Owner" is what a group calls the person, and some call it
               something else. -->
          <ocelot-input
            v-model="draftLabel"
            class="role-label"
            :label="$t('group.rights.labelField')"
            :placeholder="roleLabel({ name: activeRole.name })"
            :disabled="!canEdit"
            data-test="role-label"
          />
          <span v-if="activeRole.memberCount !== null" class="role-members">
            {{ $t('group.rights.members', { count: activeRole.memberCount }) }}
          </span>
          <os-button
            v-if="!activeRole.system && canManageRoles"
            :disabled="saving"
            data-test="role-delete"
            @click="confirmDelete"
          >
            {{ $t('group.rights.deleteRole') }}
          </os-button>
        </header>

        <!-- A role nobody can reach: every right on it is editable and none of it applies to
             anybody. Said here rather than left to the greyed rows, which showed WHAT was
             blocked and never why. -->
        <p v-if="pendingUnreachable" class="role-note" data-test="pending-unreachable">
          {{ $t('group.rights.pendingUnreachable') }}
        </p>

        <!-- The owner role is shown like the network owner: every right ticked, none editable. -->
        <p v-if="activeRole.protected" class="role-note" data-test="owner-note">
          {{ $t('group.rights.ownerHoldsEverything') }}
        </p>

        <permission-matrix
          :permissions="catalog"
          :granted="grantedOnScreen"
          :diff="hoverDiff"
          :highlight="highlightedRights"
          :group-label="(name) => $t(`permissions.sections.${name}`)"
          :disabled-for="rowDisabled"
          :hint-for="blockedHint"
          :note-for="blockedHint"
          @toggle="toggle"
          @hover="hoveredRight = $event"
        />
      </template>
    </section>

    <!-- One draft, so one Save: under whatever is unfolded, after everything it writes. -->
    <div class="actions">
      <os-button :disabled="!dirty || !canEdit" data-test="save" @click="save">
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
    <confirm-modal
      v-if="templateToApply"
      :modalData="applyTemplateModalData"
      @close="templateToApply = null"
    />
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsToggleGroup } from '@ocelot-social/ui'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import OcelotInput from '~/components/OcelotInput/OcelotInput'
import GroupRightsSimple from '~/components/Permissions/GroupRightsSimple'
import PermissionMatrix from '~/components/Permissions/PermissionMatrix'
import RoleTabs from '~/components/Permissions/RoleTabs'

import {
  deleteGroupRoleMutation,
  groupRightsQuery,
  resetGroupRolesMutation,
  updateGroupRoleMutation,
} from '~/graphql/groupRoles.js'
import { USUAL_GROUP_ROLE } from '~/constants/groups'
import groupRightsEditor from '~/mixins/groupRightsEditor'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  mixins: [groupRightsEditor],
  components: {
    ConfirmModal,
    GroupRightsSimple,
    OcelotInput,
    OsButton,
    OsCard,
    PermissionMatrix,
    RoleTabs,
    OsToggleGroup,
  },
  props: {
    group: { type: Object, required: true },
  },
  data() {
    return {
      /** The template the group runs on, as this page last knows it. */
      currentTemplate: this.group.template,
      icons: iconRegistry,
      /** The templates on offer, `{ name, roles }`. */
      templates: [],
      // The template the viewer picked, waiting for them to confirm. Replacing every role of a
      // group is too much for a browser confirm box — the same modal that asks about leaving
      // an editor asks about this.
      templateToApply: null,
      roles: [],
      myGroupPermissions: [],
    }
  },
  computed: {
    /** What this screen edits: the group's own roles. */
    editedRoles() {
      return this.roles
    },
    canManageRoles() {
      return this.myGroupPermissions.includes('group.role.manage')
    },
    /** Whether anything here can be changed right now. */
    canEdit() {
      return this.canManageRoles && !this.saving
    },
    savedMessage() {
      return 'group.rights.saved'
    },
    templateOptions() {
      return this.templates.map((template) => ({
        value: template.name,
        label: this.$t(`group.types.${template.name}`),
        disabled: !this.canEdit,
        attrs: { 'data-test': `template-${template.name}` },
      }))
    },
    applyTemplateModalData() {
      const template = this.$t(`group.types.${this.templateToApply}`)
      return {
        titleIdent: 'group.rights.applyTemplate',
        // Said when it is true: the draft is part of what the template replaces.
        messageIdent: this.dirty
          ? 'group.rights.confirmApplyTemplateDiscards'
          : 'group.rights.confirmApplyTemplate',
        messageParams: { template },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.save,
            textIdent: 'actions.save',
            callback: () => this.applyTemplate(this.templateToApply),
          },
          cancel: { icon: this.icons.close, textIdent: 'actions.cancel', callback: () => {} },
        },
      }
    },
  },
  watch: {
    // A reload of the group by the parent is the latest word on it.
    'group.template'(template) {
      this.currentTemplate = template
    },
  },
  methods: {
    /**
     * A right can only be handed out by somebody who holds it — the same coverage rule the
     * backend enforces. Showing an ineffective checkbox would promise an effect that the save
     * would then refuse.
     */
    grantable(permission) {
      return !!permission && this.myGroupPermissions.includes(permission.key)
    },
    rowDisabled(permission) {
      return (
        !this.canEdit ||
        this.activeRole?.protected ||
        !this.grantable(permission) ||
        this.isMandatory(permission) ||
        this.isMoot(permission)
      )
    },
    /** The reasons only a GROUP has: a right the network withholds, or a feature switched off. */
    gateHint(permission) {
      if (!permission || this.grantable(permission)) return null
      if (permission.requiresNetworkPermission) {
        return this.$t('group.rights.blockedByNetwork', {
          permission: permission.requiresNetworkPermission,
        })
      }
      if (permission.gatedBy?.length) {
        return this.$t('group.rights.blockedByFeature', { feature: permission.gatedBy.join(', ') })
      }
      return null
    },
    async storeRole(name, permissions, label) {
      const { data } = await this.$apollo.mutate({
        mutation: updateGroupRoleMutation(),
        variables: { groupId: this.group.id, name, permissions, label },
      })
      return data.updateGroupRole
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
    },
    /**
     * Picking a template — including the one the group already runs on, which is what "reset to
     * defaults" used to be. Two controls for one act was one too many, and the old one was
     * worse than redundant: it looked the template up by the group's VISIBILITY, so a group
     * whose rights had drifted away from its preset was reset to a different preset than the
     * one it came from.
     *
     * Confirmed, because it replaces every role rather than changing one right — and named in
     * the question, so "I meant the other one" is caught before the roles are gone.
     */
    confirmApplyTemplate(name) {
      this.templateToApply = name
    },
    async applyTemplate(template) {
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: resetGroupRolesMutation(),
          variables: { groupId: this.group.id, template },
        })
        this.roles = data.resetGroupRoles
        // Held here rather than written into the parent's group: the page owns what it just
        // did, and the parent's next load of the group says it again.
        this.currentTemplate = template
        this.resetDraft()
        this.$toast.success(this.$t('group.rights.saved'))
      } catch (error) {
        this.$toastBackendError(error)
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
        const { name } = this.activeRole
        await this.$apollo.mutate({
          mutation: deleteGroupRoleMutation(),
          variables: { groupId: this.group.id, name, reassignTo },
        })
        this.roles = this.roles.filter((role) => role.name !== name)
        this.$delete(this.drafts, name)
        this.activeRoleName = USUAL_GROUP_ROLE
      } catch (error) {
        this.$toastBackendError(error)
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
        this.templates = data.groupTemplates ?? []
        const group = data.Group?.[0]
        this.roles = group?.roles ?? []
        this.myGroupPermissions = group?.myGroupPermissions ?? []
        // A refetch (another tab saved, the page re-entered) must not throw away what the user
        // is still editing; the draft follows the server only while it holds nothing of its own.
        if (!this.dirty) this.resetDraft()
      },
    },
  },
}
</script>

<style scoped>
/* The button rows and the matrix are shared components (components/Permissions/*); what is
   left here is this page's own furniture. */
.title {
  margin-bottom: 0;
}
/* Set off from the sentences above it, which stay on screen while it is unfolded. */
.advanced {
  margin-top: var(--space-large);
  padding-top: var(--space-base);
  border-top: 1px solid var(--border-color-softer);
}
.advanced__title {
  margin: 0 0 var(--space-base);
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

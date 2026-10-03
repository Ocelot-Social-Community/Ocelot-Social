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
        :roles="rolesForSimple"
        :catalog="catalog"
        :caption="$t('group.rights.resultingType')"
        :disabled="simpleDisabled"
        :disabled-hint="simpleDisabledHint"
        :grantable="grantable"
        :hint-for="blockedHint"
        @save="saveSimple"
        @dirty="simpleDirty = $event"
        @highlight="switchHighlight = $event"
      >
        <!--
          The same presets the admin area edits, offered where a group picks one. "Turn this
          into a channel" used to be a button here that silently took two rights off the member
          role; a channel is a template now, so the choice is visible before and recognisable
          after.
        -->
        <template #visibility-control>
          <div class="template-tabs" :title="$t('group.rights.applyTemplate')">
            <button
              v-for="name in templateNames"
              :key="name"
              type="button"
              class="template-tab"
              :class="{ 'template-tab--active': name === group.template }"
              :disabled="saving || !canManageRoles || simpleDirty"
              :title="simpleDirty ? $t('group.rights.saveFirst') : null"
              :data-test="`template-${name}`"
              @click="confirmApplyTemplate(name)"
              @mouseenter="hoveredTemplateName = name"
              @mouseleave="hoveredTemplateName = null"
            >
              {{ $t(`group.types.${name}`) }}
            </button>
          </div>
        </template>

        <template #actions>
          <!-- No guard on the way IN: the simple view stays mounted, so opening the matrix can
               no longer throw its draft away. -->
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
    </section>

    <!-- The full matrix, one tab per role, under the sentences rather than instead of them. The
         card above already states the resulting visibility and follows this view's draft, so the
         line that used to repeat it here is gone. -->
    <section v-if="advanced" class="advanced" data-test="rights-advanced">
      <h3 class="advanced__title">{{ $t('group.rights.advancedTitle') }}</h3>

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

      <!-- No "add a role" here: a group defining its own roles is parked (#10356), the server
           refuses it, and a button that is refused is worse than no button. The five system
           roles are the whole vocabulary for now. -->

      <template v-if="activeRole">
        <header class="role-header">
          <ocelot-input
            v-model="draftLabel"
            class="role-label"
            :label="$t('group.rights.labelField')"
            :placeholder="roleLabel({ name: activeRole.name })"
            :disabled="!canManageRoles || saving"
            data-test="role-label"
          />
          <span v-if="activeRole.memberCount !== null" class="role-members">
            {{ $t('group.rights.members', { count: activeRole.memberCount }) }}
          </span>
        </header>

        <!-- A role nobody can reach: every right on it is editable and none of it applies to
             anybody. Said here rather than left to the greyed rows, which showed WHAT was
             blocked and never why.

             Above the owner note on purpose: that one and the matrix are a v-if/v-else pair,
             and anything between them breaks the pairing — which is how the matrix briefly
             rendered for the owner role as well. -->
        <p v-if="pendingUnreachable" class="role-note" data-test="pending-unreachable">
          {{ $t('group.rights.pendingUnreachable') }}
        </p>

        <p v-if="activeRole.protected" class="role-note" data-test="owner-note">
          {{ $t('group.rights.ownerHoldsEverything') }}
        </p>

        <permission-matrix
          v-else
          :permissions="catalog"
          :granted="draftPermissions"
          :diff="hoverDiff"
          :highlight="highlightedRights"
          :group-label="(name) => $t(`permissions.sections.${name}`)"
          :disabled-for="
            (permission) =>
              !canManageRoles ||
              !grantable(permission) ||
              saving ||
              simpleDirty ||
              isMandatory(permission) ||
              isMoot(permission)
          "
          :hint-for="blockedHint"
          :note-for="blockedHint"
          @toggle="togglePermission"
        />

        <div class="actions">
          <!-- Also for the owner role: its RIGHTS cannot be edited (it holds the catalog), but
               its name can — "Owner" is what a group calls the person, and some call it
               something else. The backend takes a relabel of a protected role for the same
               reason; the button being hidden was the only thing in the way. -->
          <os-button
            :disabled="!dirty || saving || simpleDirty || !canManageRoles"
            data-test="save"
            @click="save"
          >
            {{ $t('actions.save') }}
          </os-button>
          <os-button :disabled="!dirty || saving" data-test="revert" @click="resetDraft">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            v-if="!activeRole.system && canManageRoles"
            :disabled="saving"
            data-test="role-delete"
            @click="confirmDelete"
          >
            {{ $t('group.rights.deleteRole') }}
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
      </template>
    </section>
    <confirm-modal
      v-if="templateToApply"
      :modalData="applyTemplateModalData"
      @close="templateToApply = null"
    />
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
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
import {
  isMootRight,
  mootReasonFor,
  isSystemGroupRole,
  MANDATORY_GROUP_RIGHTS,
  PENDING_GROUP_ROLE,
} from '~/constants/groups'
import { NONE_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { iconRegistry } from '~/utils/iconRegistry'
import { orderRolesByPrivilege } from '~/utils/groupRights'
import { diffBetween, isRoleDirty, permissionSetOf } from '~/utils/permissionDiff'
import groupRights from '~/mixins/groupRights'

export default {
  mixins: [groupRights],
  components: {
    ConfirmModal,
    GroupRightsSimple,
    OcelotInput,
    OsButton,
    OsCard,
    PermissionMatrix,
    RoleTabs,
  },
  props: {
    group: { type: Object, required: true },
  },
  data() {
    return {
      icons: iconRegistry,
      catalog: [],
      templateNames: [],
      // The template the viewer picked, waiting for them to confirm. Replacing every role of a
      // group is too much for a browser confirm box — the same modal that asks about leaving
      // an editor asks about this.
      templateToApply: null,
      roles: [],
      myGroupPermissions: [],
      advanced: false,
      // Whether the simple view has an unsaved draft — it owns the draft, the page owns the
      // view toggle, and the toggle must not throw the draft away silently.
      simpleDirty: false,
      activeRoleName: USUAL_GROUP_ROLE,
      // The role tab under the cursor, to preview what it would change about the one being
      // edited — the same affordance the network and template role pages have.
      hoveredRoleName: null,
      // The template button under the cursor, and what the simple view says it is pointing at.
      hoveredTemplateName: null,
      switchHighlight: null,
      draftPermissions: [],
      draftLabel: '',
      saving: false,
    }
  },
  computed: {
    canManageRoles() {
      return this.myGroupPermissions.includes('group.role.manage')
    },
    /**
     * The two views edit the same roles, so only one of them may hold a draft at a time —
     * whichever saved second would discard the other's edit without saying so.
     */
    simpleDisabled() {
      return this.saving || !this.canManageRoles || this.dirty
    },
    simpleDisabledHint() {
      return this.dirty ? this.$t('group.rights.saveFirst') : this.$t('group.rights.noRight')
    },
    orderedRoles() {
      return orderRolesByPrivilege(this.roles)
    },
    applyTemplateModalData() {
      const template = this.$t(`group.types.${this.templateToApply}`)
      return {
        titleIdent: 'group.rights.applyTemplate',
        messageIdent: 'group.rights.confirmApplyTemplate',
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
    /** The applicant role is being edited, and nothing can produce an applicant. */
    pendingUnreachable() {
      return (
        this.activeRoleName === PENDING_GROUP_ROLE &&
        !this.roles.some((role) => role.permissions?.includes('group.join.request'))
      )
    },
    activeRole() {
      return this.roles.find((role) => role.name === this.activeRoleName) ?? null
    },
    // Hovering another role marks every right it would change against the DRAFT: 'added'
    // where the hovered role grants what this one does not, 'removed' the other way round.
    hoverDiff() {
      if (!this.hoveredRoleName || this.hoveredRoleName === this.activeRoleName) return {}
      const hovered = this.roles.find((role) => role.name === this.hoveredRoleName)
      if (!hovered) return {}
      return diffBetween(
        this.catalog,
        new Set(this.draftPermissions),
        this.permissionSetOf(hovered),
      )
    },
    dirty() {
      return isRoleDirty(this.activeRole, this.draftPermissions, this.draftLabel)
    },
    /**
     * What the matrix and the role tabs should point at: the sentence under the cursor, else —
     * for a template button — every role, because putting a template on a group replaces all of
     * them. What a template would change to cannot be shown here: its contents sit behind
     * `group.roleTemplate.manage`, which a group owner does not hold, so this page knows the
     * names and nothing else.
     */
    highlight() {
      if (this.switchHighlight) return this.switchHighlight
      if (!this.hoveredTemplateName) return null
      return Object.fromEntries(this.roles.map((role) => [role.name, []]))
    },
    /** The highlighted rights OF THE ROLE ON SCREEN — a sentence about another role marks none. */
    highlightedRights() {
      return this.highlight?.[this.activeRoleName] ?? []
    },
    /**
     * The roles as the card above should read them: what is stored, with the matrix's UNSAVED
     * edit folded in. The two views are on screen together now, so without this the card would
     * go on calling a group hidden while the row that makes it public sits ticked just below.
     *
     * Only while that edit exists — the card's own switches are locked then, so handing the
     * component a new array (which resets its draft) costs nothing. Doing it unconditionally
     * would reset that draft on every role tab click instead.
     */
    rolesForSimple() {
      if (!this.dirty || !this.activeRole) return this.roles
      return this.roles.map((role) =>
        role.name === this.activeRoleName ? { ...role, permissions: this.draftPermissions } : role,
      )
    },
  },
  watch: {
    activeRoleName() {
      this.resetDraft()
    },
  },
  methods: {
    isSystemGroupRole,
    /** Whether anything under the cursor reaches this role. */
    highlightsRole(role) {
      return !!this.highlight && role.name in this.highlight
    },
    /**
     * Why a role tab cannot be opened — today only the applicant role, when nothing lets
     * anybody ask to join. Blocked rather than left to open onto an explanation: a role nobody
     * can hold has nothing to configure, and the cursor is already on the tab.
     */
    blockedRole(role) {
      if (role.name !== PENDING_GROUP_ROLE) return null
      const reachable = this.roles.some((candidate) =>
        candidate.permissions?.includes('group.join.request'),
      )
      return reachable ? null : this.$t('group.rights.pendingBlocked')
    },
    /**
     * A right can only be handed out by somebody who holds it — the same coverage rule the
     * backend enforces. Showing an ineffective checkbox would promise an effect that the save
     * would then refuse.
     */
    /**
     * A right the role cannot be written without, so the box is ticked and locked rather than
     * offered: `group.leave` on anything that IS a membership. Without it the only way out of
     * the group would be somebody else removing you (see groupRole/mandatoryRights.ts).
     */
    /**
     * A right that means nothing for this role: `group.leave` on the non-member role, which has
     * no membership to end. Greyed rather than offered — a checkbox that changes nothing is
     * worse than one that is not there.
     */
    isMoot(permission) {
      return isMootRight(this.activeRoleName, permission?.key)
    },
    isMandatory(permission) {
      // The simple view asks about rights the catalog may not carry yet, so a missing entry is
      // a legitimate argument here and answers "no" rather than throwing.
      return (
        this.activeRoleName !== NONE_GROUP_ROLE && MANDATORY_GROUP_RIGHTS.includes(permission?.key)
      )
    },
    grantable(permission) {
      return !!permission && this.myGroupPermissions.includes(permission.key)
    },
    blockedHint(permission) {
      // The lock between the two views, said where the cursor is: the card above holds an
      // unsaved edit, and whichever of the two saved second would discard the other's.
      if (this.simpleDirty) return this.$t('group.rights.saveFirst')
      if (this.isMoot(permission)) {
        return this.$t(mootReasonFor(this.activeRoleName, permission?.key))
      }
      if (this.isMandatory(permission)) {
        return this.$t('group.rights.mandatory')
      }
      if (!permission) return null
      if (permission.requiresNetworkPermission && !this.grantable(permission)) {
        return this.$t('group.rights.blockedByNetwork', {
          permission: permission.requiresNetworkPermission,
        })
      }
      if (permission.gatedBy?.length && !this.grantable(permission)) {
        return this.$t('group.rights.blockedByFeature', { feature: permission.gatedBy.join(', ') })
      }
      return null
    },
    // What a role effectively grants. `owner` stores no list and resolves to the whole
    // catalog, so hovering it has to show that rather than an empty role.
    permissionSetOf(role) {
      return permissionSetOf(role, this.catalog)
    },
    resetDraft() {
      this.draftPermissions = this.activeRole ? [...this.activeRole.permissions] : []
      this.draftLabel = this.activeRole?.label ?? ''
    },
    togglePermission(key, enabled) {
      this.draftPermissions = enabled
        ? [...this.draftPermissions, key]
        : this.draftPermissions.filter((candidate) => candidate !== key)
    },
    async writeRole(name, permissions, label) {
      this.saving = true
      try {
        const { data } = await this.$apollo.mutate({
          mutation: updateGroupRoleMutation(),
          variables: { groupId: this.group.id, name, permissions, label: label || null },
        })
        this.mergeRole(data.updateGroupRole)
        this.$toast.success(this.$t('group.rights.saved'))
      } catch (error) {
        this.$toast.error(error.message)
        // The checkbox is where the click left it, and `:checked` binds a value that did not
        // change — so without this the switch keeps showing a right the group does not have.
        this.$forceUpdate()
      } finally {
        this.saving = false
      }
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
      if (role.name === this.activeRoleName) this.resetDraft()
    },
    save() {
      if (!this.activeRole) return
      // The owner role keeps no list — only its label can move.
      const permissions = this.activeRole.protected ? [] : this.draftPermissions
      return this.writeRole(this.activeRole.name, permissions, this.draftLabel)
    },
    /**
     * The simple view's draft, written in one go.
     *
     * Sequentially rather than in parallel: each write answers with the role it stored and the
     * page merges it, and two answers landing at once would have the second merge overwrite the
     * list the first just produced.
     */
    async saveSimple(changes) {
      for (const change of changes) {
        const role = this.roles.find((candidate) => candidate.name === change.name)
        if (!role) continue
        await this.writeRole(role.name, change.permissions, role.label)
      }
    },
    /**
     * The read-only channel from #5588: members read, only admins write. Expressed as the
     * three rights it actually is rather than as a mode the backend would have to know about.
     */
    /**
     * Put a whole template on this group.
     *
     * Confirmed, because it replaces every role rather than changing one right — and named in
     * the question, so "I meant the other one" is caught before the roles are gone.
     */
    /**
     * Picking a template — including the one the group already runs on, which is what "reset to
     * defaults" used to be. Two controls for one act was one too many, and the old one was
     * worse than redundant: it looked the template up by the group's VISIBILITY, so a group
     * whose rights had drifted away from its preset was reset to a different preset than the
     * one it came from.
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
        this.group.template = template
        this.resetDraft()
        this.$toast.success(this.$t('group.rights.saved'))
      } catch (error) {
        this.$toast.error(error.message)
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
        await this.$apollo.mutate({
          mutation: deleteGroupRoleMutation(),
          variables: { groupId: this.group.id, name: this.activeRole.name, reassignTo },
        })
        this.roles = this.roles.filter((role) => role.name !== this.activeRole.name)
        this.activeRoleName = USUAL_GROUP_ROLE
      } catch (error) {
        this.$toast.error(error.message)
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
        this.templateNames = (data.groupTemplates ?? []).map((template) => template.name)
        const group = data.Group?.[0]
        this.roles = group?.roles ?? []
        this.myGroupPermissions = group?.myGroupPermissions ?? []
        this.resetDraft()
      },
    },
  },
}
</script>

<style scoped>
/* The pill row and the matrix are shared components now (components/Permissions/*); what is
   left here is this page's own furniture. */
.template-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xx-small);
}

.template-tab {
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-x-large);
  background: var(--background-color-base);
  color: var(--text-color-base);
  padding: var(--space-xx-small) var(--space-small);
  font-size: 0.9em;
  line-height: 1.4;
  cursor: pointer;
}

.template-tab:hover:not(:disabled) {
  background: var(--background-color-softer);
}

.template-tab--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  font-weight: bold;
}

.template-tab--active:hover:not(:disabled) {
  background: var(--color-primary);
}

.template-tab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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

import {
  isMootRight,
  isSystemGroupRole,
  mootReasonFor,
  MANDATORY_GROUP_RIGHTS,
  NONE_GROUP_ROLE,
  PENDING_GROUP_ROLE,
  USUAL_GROUP_ROLE,
} from '~/constants/groups'
import groupRights from '~/mixins/groupRights'
import { orderRolesByPrivilege } from '~/utils/groupRights'
import { diffBetween, isRoleDirty, permissionSetOf } from '~/utils/permissionDiff'

/**
 * A rights screen: the sentences, the matrix under them, and the one draft they share.
 *
 * Two screens edit group roles — a group editing its own, and the admin editing the template
 * new groups start from — and they are the same program over different data. They were two
 * copies of it, and the copies kept drifting in ways nobody could see from either file: the
 * role tabs showed five locks on one screen and one on the other, the same five roles were
 * called "Mitglied" here and `usual` there, and a blocked right gave the wrong reason on one of
 * them. Each of those was one page learning something the other did not.
 *
 * What a page still has to say for itself, because it genuinely differs:
 *
 *   editedRoles   which roles are on this screen (a group's own, or a template's)
 *   highlight     what a hovered control reaches here — the admin can compare templates,
 *                 a group cannot see their contents at all
 *   save          which mutation stores a role
 *   gateHint      extra reasons a right cannot be granted (optional; the network gates)
 *
 * Everything below follows from those.
 */
export default {
  mixins: [groupRights],
  data() {
    return {
      /** The group permission catalog — every right that can be granted at all. */
      catalog: [],
      activeRoleName: USUAL_GROUP_ROLE,
      /**
       * Whether the matrix is unfolded under the sentences. BOTH are on screen then, and only
       * one of them may hold a draft at a time: they edit the same roles, and whichever saved
       * second would discard the other's edit without saying so.
       */
      advanced: false,
      /** Whether the sentences above hold an unsaved edit — the other half of that lock. */
      simpleDirty: false,
      /** The role tab under the cursor, to preview what it would change about the edited one. */
      hoveredRoleName: null,
      /** What the sentences say the cursor points at: `{ roleName: [permissionKey] }`. */
      switchHighlight: null,
      draft: [],
      draftLabel: '',
      saving: false,
    }
  },
  computed: {
    activeRole() {
      return this.editedRoles.find((role) => role.name === this.activeRoleName) ?? null
    },
    // Least privileged first, like everywhere else roles are listed: outsider, applicant,
    // member, whatever else there is, owner.
    orderedRoles() {
      return orderRolesByPrivilege(this.editedRoles)
    },
    dirty() {
      return isRoleDirty(this.activeRole, this.draft, this.draftLabel)
    },
    /** Whether anything on this screen lets somebody ask to join — see `blockedRole`. */
    pendingReachable() {
      return this.editedRoles.some((role) => role.permissions?.includes('group.join.request'))
    },
    /** The applicant role is the one being edited, and nothing here produces an applicant. */
    pendingUnreachable() {
      return this.activeRoleName === PENDING_GROUP_ROLE && !this.pendingReachable
    },
    /**
     * What the cursor is previewing, or null. Another role of this screen by default; the admin
     * page overrides this to also offer the same role in ANOTHER template, which is the
     * comparison those presets exist to make.
     */
    hoveredRole() {
      if (!this.hoveredRoleName || this.hoveredRoleName === this.activeRoleName) return null
      return this.editedRoles.find((role) => role.name === this.hoveredRoleName) ?? null
    },
    // Every right the preview would change: 'added' where the hovered role grants what the
    // edited one does not, 'removed' the other way round. Against the DRAFT, so an unsaved
    // edit is part of the comparison rather than ignored by it.
    hoverDiff() {
      if (!this.hoveredRole) return {}
      return diffBetween(this.catalog, new Set(this.draft), this.permissionSetOf(this.hoveredRole))
    },
    /** The highlighted rights OF THE ROLE ON SCREEN — a sentence about another role marks none. */
    highlightedRights() {
      return this.highlight?.[this.activeRoleName] ?? []
    },
    /**
     * The roles as the SENTENCES should read them: what is stored, with the matrix's unsaved
     * edit folded in. The two views are on screen together, so without this the card above
     * would go on calling a group hidden while the row that makes it public sits ticked just
     * below.
     *
     * Only while that edit exists — the sentences are locked then, so handing them a new array
     * (which resets their draft) costs nothing. Unconditionally it would reset that draft on
     * every role tab click instead.
     */
    rolesForSimple() {
      if (!this.dirty || !this.activeRole) return this.editedRoles
      return this.editedRoles.map((role) =>
        role.name === this.activeRoleName ? { ...role, permissions: this.draft } : role,
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
    resetDraft() {
      this.draft = this.activeRole ? [...this.activeRole.permissions] : []
      this.draftLabel = this.activeRole?.label ?? ''
    },
    toggle(key, enabled) {
      this.draft = enabled ? [...this.draft, key] : this.draft.filter((held) => held !== key)
    },
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
      return this.pendingReachable ? null : this.$t('group.rights.pendingBlocked')
    },
    // The rights a role effectively holds. `owner` stores no list and resolves to the whole
    // catalog — hovering it has to show that, not an empty role.
    permissionSetOf(role) {
      return permissionSetOf(role, this.catalog)
    },
    /**
     * A right that means nothing for this role: `group.leave` on the non-member role, which has
     * no membership to end. Greyed rather than offered — a checkbox that changes nothing is
     * worse than one that is not there.
     */
    isMoot(permission) {
      return isMootRight(this.activeRoleName, permission?.key)
    },
    /**
     * Ticked and locked: a membership role cannot be stored without the right to end the
     * membership (see groupRole/mandatoryRights.ts).
     *
     * The sentences ask about rights the catalog may not carry yet, so a missing entry is a
     * legitimate argument here and answers "no" rather than throwing.
     */
    isMandatory(permission) {
      return (
        this.activeRoleName !== NONE_GROUP_ROLE && MANDATORY_GROUP_RIGHTS.includes(permission?.key)
      )
    },
    /** Why a row cannot be ticked, in words — shown on the row, not only as a tooltip. */
    blockedHint(permission) {
      // The lock between the two views, said where the cursor is: the sentences above hold an
      // unsaved edit, and whichever of the two saved second would discard the other's.
      if (this.simpleDirty) return this.$t('group.rights.saveFirst')
      if (this.isMoot(permission)) {
        return this.$t(mootReasonFor(this.activeRoleName, permission?.key))
      }
      if (this.isMandatory(permission)) return this.$t('group.rights.mandatory')
      return this.gateHint(permission)
    },
    /** Further reasons this screen knows about. Only a group has gates to report. */
    gateHint() {
      return null
    },
  },
}

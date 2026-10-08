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
import { rightsTouchedBy } from '~/utils/groupRoleRights'
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
 *   editedRoles   which roles are on this screen (a group's own, or a template's), as stored
 *   templates     the templates on offer, `{ name, roles }` — what a hovered one would change
 *   storeRole     which mutation stores a role; answers with the role as stored
 *   mergeRole     where a stored role goes back into the page's data
 *   savedMessage  the toast once everything is written
 *   rowDisabled   which matrix rows cannot be ticked here
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
      /** Whether the matrix is unfolded under the sentences. */
      advanced: false,
      /**
       * The ONE draft of this screen: `{ roleName: { permissions, label } }`, for the roles that
       * differ from what is stored.
       *
       * The sentences and the matrix used to keep one each, and since whichever saved second
       * would have discarded the other's edit, each view locked the other while it held one.
       * One draft for both makes the lock unnecessary: a tick in the matrix is a tick in the
       * sentences, and the other way round. Keyed by role, so a role tab click keeps what was
       * done to the role one came from.
       */
      drafts: {},
      /** The role tab under the cursor, to preview what it would change about the edited one. */
      hoveredRoleName: null,
      /** The template button under the cursor, to preview what putting it on would change. */
      hoveredTemplateName: null,
      /** What the sentences say the cursor points at: `{ roleName: [permissionKey] }`. */
      switchHighlight: null,
      /** The matrix row under the cursor. */
      hoveredRight: null,
      saving: false,
    }
  },
  computed: {
    /** The role on screen, as stored. */
    activeRole() {
      return this.editedRoles.find((role) => role.name === this.activeRoleName) ?? null
    },
    /** Every role of this screen with the draft folded in — what BOTH views show. */
    draftedRoles() {
      return this.editedRoles.map((role) => {
        const draft = this.drafts[role.name]
        return draft ? { ...role, permissions: draft.permissions, label: draft.label } : role
      })
    },
    // Least privileged first, like everywhere else roles are listed: outsider, applicant,
    // member, whatever else there is, owner.
    orderedRoles() {
      return orderRolesByPrivilege(this.draftedRoles)
    },
    /** The rights the role on screen holds in the draft — what the matrix ticks. */
    draft() {
      return this.draftOf(this.activeRoleName).permissions
    },
    /** The name the role on screen goes by in the draft. */
    draftLabel: {
      get() {
        return this.draftOf(this.activeRoleName).label
      },
      set(label) {
        this.setDraft(this.activeRoleName, { label })
      },
    },
    /** The roles the draft would change, as they would be written. */
    changes() {
      return this.draftedRoles.filter((drafted) => {
        const stored = this.editedRoles.find((role) => role.name === drafted.name)
        return isRoleDirty(stored, drafted.permissions, drafted.label)
      })
    },
    dirty() {
      return this.changes.length > 0
    },
    /** Whether anything on this screen lets somebody ask to join — see `blockedRole`. */
    pendingReachable() {
      return this.draftedRoles.some((role) => role.permissions?.includes('group.join.request'))
    },
    /** The applicant role is the one being edited, and nothing here produces an applicant. */
    pendingUnreachable() {
      return this.activeRoleName === PENDING_GROUP_ROLE && !this.pendingReachable
    },
    hoveredTemplate() {
      return this.templates.find((template) => template.name === this.hoveredTemplateName) ?? null
    },
    /**
     * What the cursor is previewing, or null: the SAME role in a hovered template — what putting
     * that template on would make of it — or another role of this screen. Two hovers, one
     * comparison: the rows can only mark one difference at a time, and the template is the more
     * specific of the two.
     */
    hoveredRole() {
      if (this.hoveredTemplate) {
        return this.hoveredTemplate.roles.find((role) => role.name === this.activeRoleName) ?? null
      }
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
    /**
     * What a hovered template would change, role by role: every right it would add or take
     * away. A role the template does not have at all is marked as a whole.
     */
    templateHighlight() {
      if (!this.hoveredTemplate) return null
      const marked = {}
      for (const role of this.draftedRoles) {
        const other = this.hoveredTemplate.roles.find((candidate) => candidate.name === role.name)
        if (!other) {
          marked[role.name] = []
          continue
        }
        const changed = Object.keys(
          diffBetween(this.catalog, this.permissionSetOf(role), this.permissionSetOf(other)),
        )
        if (changed.length) marked[role.name] = changed
      }
      return marked
    },
    /**
     * A matrix row says which sentence, which state and which role tab it belongs to — the way
     * back from the catalog's vocabulary to the page's. With whatever the right drags along, as
     * the hover over a sentence does.
     */
    matrixHighlight() {
      if (!this.hoveredRight) return null
      return { [this.activeRoleName]: rightsTouchedBy(this.hoveredRight) }
    },
    /**
     * What every view on the page should point at: `{ roleName: [permissionKey] }`. A role key
     * alone marks the role, its rights mark the rows, sentences and states they stand for.
     * Whatever is under the cursor is the most specific answer, so a sentence or a row wins
     * over a template.
     */
    highlight() {
      return this.switchHighlight ?? this.matrixHighlight ?? this.templateHighlight
    },
    /**
     * The roles as they would be after a click on whatever the page has under the cursor — a
     * template button, or a matrix row that can be ticked — for the sentences and states to say
     * what they would become. Null when nothing under the cursor changes anything.
     */
    previewRoles() {
      if (this.hoveredTemplate) {
        return this.draftedRoles.map((role) => {
          const other = this.hoveredTemplate.roles.find((candidate) => candidate.name === role.name)
          return other ? { ...role, permissions: other.permissions } : role
        })
      }
      const permission = this.catalog.find((entry) => entry.key === this.hoveredRight)
      if (!permission || this.rowDisabled(permission)) return null
      const permissions = this.draft.includes(permission.key)
        ? this.draft.filter((held) => held !== permission.key)
        : [...this.draft, permission.key]
      return this.draftedRoles.map((role) =>
        role.name === this.activeRoleName ? { ...role, permissions } : role,
      )
    },
    /** The highlighted rights OF THE ROLE ON SCREEN — a sentence about another role marks none. */
    highlightedRights() {
      return this.highlight?.[this.activeRoleName] ?? []
    },
  },
  methods: {
    isSystemGroupRole,
    /** A role's rights and name as the draft has them, falling back to what is stored. */
    draftOf(name) {
      const role = this.editedRoles.find((candidate) => candidate.name === name)
      return (
        this.drafts[name] ?? {
          permissions: [...(role?.permissions ?? [])],
          label: role?.label ?? '',
        }
      )
    },
    /**
     * Change a role in the draft. A change that lands back on what is stored drops the role from
     * the draft, so ticking and unticking leaves nothing to save.
     */
    setDraft(name, change) {
      const role = this.editedRoles.find((candidate) => candidate.name === name)
      if (!role) return
      const next = { ...this.draftOf(name), ...change }
      if (isRoleDirty(role, next.permissions, next.label)) {
        this.$set(this.drafts, name, next)
      } else {
        this.$delete(this.drafts, name)
      }
    },
    /** A sentence or the door changed a role. */
    changeRole(name, permissions) {
      this.setDraft(name, { permissions })
    },
    /** A matrix row ticked or unticked, on the role on screen. */
    toggle(key, enabled) {
      const permissions = enabled ? [...this.draft, key] : this.draft.filter((held) => held !== key)
      this.setDraft(this.activeRoleName, { permissions })
    },
    resetDraft() {
      this.drafts = {}
    },
    /**
     * Ask before something replaces the roles on screen while the draft holds an edit of them.
     * Nothing to ask when there is nothing to lose.
     */
    mayDiscardDraft() {
      return !this.dirty || window.confirm(this.$t('group.rights.discardDraft'))
    },
    /**
     * Every changed role, written in one go.
     *
     * Sequentially rather than in parallel: each write answers with the role it stored and the
     * page merges it, and two answers landing at once would have the second merge overwrite the
     * list the first just produced. A refusal stops there — the roles not written yet stay in
     * the draft, so nothing is lost and the next save picks up where this one stopped.
     */
    async save() {
      this.saving = true
      try {
        for (const change of this.changes) {
          // The owner role keeps no list of its own — only its name can move.
          const permissions = change.protected
            ? this.editedRoles.find((role) => role.name === change.name).permissions
            : change.permissions
          const stored = await this.storeRole(change.name, permissions, change.label || null)
          this.mergeRole(stored)
          this.$delete(this.drafts, change.name)
        }
        this.$toast.success(this.$t(this.savedMessage))
      } catch (error) {
        this.$toastBackendError(error)
      } finally {
        this.saving = false
      }
    },
    /** Whether anything under the cursor reaches this role. */
    highlightsRole(role) {
      return !!this.highlight && role.name in this.highlight
    },
    /** Whether this role has an unsaved edit — so the tab says so after one has moved on. */
    isRoleDrafted(role) {
      return this.changes.some((change) => change.name === role.name)
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

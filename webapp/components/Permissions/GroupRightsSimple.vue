<template>
  <!--
    The handful of questions a group actually asks itself, as sentences — and above them, the two
    things those answers MAKE the group: how far it can be seen, and how somebody gets in.

    One component for both levels: a group editing its own rights, and the admin editing the
    template new groups start from. Both states are derived from the same non-member role in both
    places, so stating them in two implementations is how the two came to disagree.

    Edits are a DRAFT. A single tick here can open a group to the whole network, and that is too
    much to happen on the way past — the cards preview what the draft would make the group, and
    nothing is written until somebody says so.
  -->
  <div class="simple-rights">
    <!--
      Two halves: what the group IS, and what sets it. Each control carried its state's glyph
      for a while, which tied the two together but let a wrapped description drag its buttons
      out of line — so the statements keep the pictures and the controls stand as a list of
      their own, each under its own heading.
    -->
    <div class="states">
      <!-- Left: what the group IS, each statement with its glyph, the two as one unit. -->
      <div class="states__facts">
        <div class="state" :data-test="`visibility-${visibility}`">
          <os-icon
            :icon="icons[visibilityIcon]"
            size="2xl"
            class="state__icon"
            aria-hidden="true"
          />
          <div class="state__text">
            <p class="state__caption">{{ caption }}</p>
            <strong class="state__title" data-test="visibility-title">
              {{ $t(`group.types.${visibility}`) }}
            </strong>
            <p class="state__description" data-test="visibility-description">
              {{ $t(`group.typeDescriptions.${visibility}`) }}
            </p>
          </div>
        </div>

        <div class="state" :data-test="`admission-${admission}`">
          <os-icon :icon="icons[admissionIcon]" size="2xl" class="state__icon" aria-hidden="true" />
          <div class="state__text">
            <p class="state__caption">{{ $t('group.admission.caption') }}</p>
            <strong class="state__title" data-test="admission-title">
              {{ $t(`group.admission.${admission}.title`) }}
            </strong>
            <p class="state__description" data-test="admission-description">
              {{ $t(`group.admission.${admission}.description`) }}
            </p>
            <p v-if="admissionLocked" class="state__reason" data-test="admission-locked">
              {{ $t('group.admission.needsVisibility') }}
            </p>
          </div>
        </div>
      </div>

      <!--
        Right: what SETS them, as a block of labelled rows of its own — read as a list of
        controls rather than hung off the pictures beside it. Each row carries its own heading,
        which is what lets it stand away from the statement it changes.
      -->
      <div class="states__controls">
        <!-- The page's own way of picking this — the template tabs on both levels. The LABEL is
             here rather than in the slot: the page used to bring its own, and the two then stood
             above each other saying "Vorlage" twice. -->
        <div class="state__control">
          <span class="state__control-label">{{ $t('admin.groupRoles.templateLabel') }}</span>
          <slot name="visibility-control" />
        </div>

        <!--
          Three states of ONE question, so one control with three positions rather than three
          checkboxes: two ticks would let somebody express "anybody may enter AND must ask",
          which the model has no answer for.

          A row of buttons rather than a dropdown: all three answers are readable at once, which
          matters for a setting whose options are opposite ends of one scale.
        -->
        <div class="state__control" role="radiogroup" :aria-label="$t('group.admission.label')">
          <span class="state__control-label">{{ $t('group.admission.label') }}</span>
          <div class="state__control-options">
            <button
              v-for="state in admissionStates"
              v-show="!admissionLocked || state === admission"
              :key="state"
              type="button"
              role="radio"
              :aria-checked="String(state === admission)"
              class="admission-option"
              :class="{ 'admission-option--active': state === admission }"
              :disabled="!admissionEditable"
              :title="admissionEditable ? null : admissionHint"
              :data-test="`admission-option-${state}`"
              @click="setAdmission(state)"
              @mouseenter="highlightAdmission"
              @mouseleave="clearHighlight"
            >
              {{ $t(`group.admission.${state}.title`) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Grouped by WHO the sentence is about, because that is the order somebody reads them
         in: what members may do, then what the people waiting see, then what everybody else
         sees. Eight sentences in one list made the reader find that grouping themselves. -->
    <div class="switch-groups">
      <fieldset v-for="group in switchGroups" :key="group.name" class="switch-group">
        <legend class="switch-group__title">
          {{ $t(`group.rights.simpleGroups.${group.name}`) }}
        </legend>
        <ul class="switches">
          <li
            v-for="item in group.items"
            :key="item.id"
            class="switch"
            :data-test="`switch-row-${item.id}`"
            @mouseenter="highlightSwitch(item)"
            @mouseleave="clearHighlight"
          >
            <label :class="{ 'switch--disabled': !item.editable }" :title="item.hint">
              <input
                type="checkbox"
                :checked="item.enabled"
                :disabled="!item.editable"
                :data-test="`switch-${item.id}`"
                @change="toggle(item, $event.target.checked)"
              />
              <span>{{ $t(`group.rights.simple.${item.id}`) }}</span>
            </label>
          </li>
        </ul>
      </fieldset>
    </div>

    <div class="actions">
      <os-button :disabled="!dirty || disabled" data-test="simple-save" @click="save">
        {{ $t('actions.save') }}
      </os-button>
      <os-button :disabled="!dirty || disabled" data-test="simple-revert" @click="resetDraft">
        {{ $t('actions.cancel') }}
      </os-button>
      <!-- The buttons differ per level — a group resets to defaults, the admin applies to
           groups — so the rest of the row belongs to the page. -->
      <slot name="actions" />
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { ADMISSION_STATES, admissionOf, JOIN_RIGHTS, withAdmission } from '~/utils/groupAdmission'
import { privacyLevelOf } from '~/utils/groupPrivacyLevel'
import { applyRightChange, rightsTouchedBy } from '~/utils/groupRoleRights'
import { iconRegistry } from '~/utils/iconRegistry'

// Declared rather than hand-written per row: one sentence, one role, one right. The order is the
// reading order — what members may do, then what applicants see, then what outsiders see.
// Which heading each sentence belongs under — the role it is about, read as a group of people
// rather than as a role key.
const SWITCH_GROUPS = ['members', 'applicants', 'outsiders']

const SIMPLE_SWITCHES = [
  { id: 'members-post', group: 'members', role: USUAL_GROUP_ROLE, permission: 'group.post.create' },
  {
    id: 'members-comment',
    group: 'members',
    role: USUAL_GROUP_ROLE,
    permission: 'group.comment.create',
  },
  {
    id: 'members-chat',
    group: 'members',
    role: USUAL_GROUP_ROLE,
    permission: 'group.chat.participate',
  },
  { id: 'members-invite', group: 'members', role: USUAL_GROUP_ROLE, permission: 'group.invite' },
  {
    id: 'applicants-read',
    group: 'applicants',
    role: PENDING_GROUP_ROLE,
    permission: 'group.content.read',
  },
  // The hinge of the whole visibility: without `group.read` on the non-member role a group is
  // hidden no matter what else is ticked.
  { id: 'nonmembers-profile', group: 'outsiders', role: NONE_GROUP_ROLE, permission: 'group.read' },
  {
    id: 'nonmembers-read',
    group: 'outsiders',
    role: NONE_GROUP_ROLE,
    permission: 'group.content.read',
  },
  {
    id: 'nonmembers-members',
    group: 'outsiders',
    role: NONE_GROUP_ROLE,
    permission: 'group.members.read',
  },
]

// One glyph per state, from the icons the app already ships.
const VISIBILITY_ICONS = { public: 'globe', closed: 'lock', hidden: 'eyeSlash' }
const ADMISSION_ICONS = { open: 'signIn', onRequest: 'handPointer', closed: 'ban' }

export default {
  name: 'GroupRightsSimple',
  components: { OsButton, OsIcon },
  props: {
    /** The group's (or template's) role definitions: `{ name, permissions, … }`. */
    roles: { type: Array, required: true },
    /** The group permission catalog, for the gate and prerequisite hints. */
    catalog: { type: Array, required: true },
    /** The sentence above the visibility — what the group IS, or what new groups WILL BE. */
    caption: { type: String, required: true },
    /** Nothing is editable: no right to edit, or a save in flight. */
    disabled: { type: Boolean, default: false },
    /** Why nothing is editable, shown on every row while `disabled`. */
    disabledHint: { type: String, default: null },
    /** Whether the viewer may grant this catalog entry at all. */
    grantable: { type: Function, default: () => true },
    /** Why a single row cannot be ticked — a closed gate, a missing network right. */
    hintFor: { type: Function, default: () => null },
  },
  data() {
    return { icons: iconRegistry, admissionStates: ADMISSION_STATES, draft: {} }
  },
  computed: {
    /**
     * What the group would be if the draft were saved, read off the rights its NON-MEMBER role
     * would then hold — the same two the backend derives it from.
     */
    visibility() {
      return privacyLevelOf(this.permissionsOf(NONE_GROUP_ROLE))
    },
    admission() {
      return admissionOf(this.permissionsOf(NONE_GROUP_ROLE))
    },
    visibilityIcon() {
      return VISIBILITY_ICONS[this.visibility]
    },
    admissionIcon() {
      return ADMISSION_ICONS[this.admission]
    },
    /**
     * A door only exists where there is a group to see. Entering and asking to enter both begin
     * with finding the group, so on a hidden one neither is a setting — the backend drops both
     * rights for the same reason, and offering the choice here would promise something the save
     * would silently undo.
     */
    admissionLocked() {
      return this.visibility === 'hidden'
    },
    admissionEditable() {
      return !this.disabled && !this.admissionLocked && !!this.roleNamed(NONE_GROUP_ROLE)
    },
    admissionHint() {
      if (this.admissionLocked) return this.$t('group.admission.needsVisibility')
      return this.disabled ? this.disabledHint : null
    },
    switches() {
      return SIMPLE_SWITCHES.map((item) => {
        const role = this.roleNamed(item.role)
        const permission = this.catalog.find((entry) => entry.key === item.permission)
        const allowed = !!role && !!permission && this.grantable(permission)
        const moot = this.mootReasonFor(item)
        return {
          ...item,
          enabled: this.permissionsOf(item.role).includes(item.permission),
          editable: allowed && !this.disabled && !moot,
          // The reason it cannot be answered comes first: "you may not grant this" is true of a
          // locked row too, and the more specific answer is the useful one.
          hint: moot || this.hintFor(permission) || (this.disabled ? this.disabledHint : null),
        }
      })
    },
    /** The sentences under their heading, in the order the headings are declared. */
    switchGroups() {
      return SWITCH_GROUPS.map((name) => ({
        name,
        items: this.switches.filter((item) => item.group === name),
      })).filter((group) => group.items.length > 0)
    },
    /** The roles the draft would change, and what it would change them to. */
    changes() {
      return this.roles
        .filter((role) => this.draft[role.name])
        .map((role) => ({ name: role.name, permissions: this.draft[role.name] }))
        .filter(({ name, permissions }) => !this.same(permissions, this.storedPermissions(name)))
    },
    dirty() {
      return this.changes.length > 0
    },
  },
  watch: {
    // A fresh answer from the server replaces the draft: what is on screen must be what is
    // stored, or the next save would write an edit against a group that moved on.
    roles() {
      this.resetDraft()
    },
    // Announced so a page showing the matrix as well can lock it: both edit the same roles, and
    // whichever saved second would discard the other without saying so.
    dirty(value) {
      this.$emit('dirty', value)
    },
  },
  methods: {
    /**
     * Why a sentence has nothing to decide, or null.
     *
     * Today only the applicant ones: a role nobody can hold answers no question. Which is read
     * off the DRAFT's admission rather than off what is stored, so choosing "anybody may walk
     * in" greys the applicant row under the cursor instead of one save later — the two controls
     * are side by side, and a live setting with a stale consequence next to it is worse than no
     * consequence at all.
     */
    mootReasonFor(item) {
      if (item.role !== PENDING_GROUP_ROLE) return null
      return this.admission === 'onRequest' ? null : this.$t('group.rights.pendingBlocked')
    },
    roleNamed(name) {
      return this.roles.find((role) => role.name === name)
    },
    storedPermissions(name) {
      return this.roleNamed(name)?.permissions ?? []
    },
    /** What the role holds in the draft, falling back to what is stored. */
    permissionsOf(name) {
      return this.draft[name] ?? this.storedPermissions(name)
    },
    same(left, right) {
      const a = new Set(left)
      const b = new Set(right)
      return a.size === b.size && [...a].every((key) => b.has(key))
    },
    toggle(item, enabled) {
      // Through the coupling: ticking "outsiders may read the posts" also grants the right to
      // see the group at all, and unticking that one takes the posts with it.
      this.$set(
        this.draft,
        item.role,
        applyRightChange(this.permissionsOf(item.role), item.permission, enabled),
      )
    },
    setAdmission(state) {
      this.$set(
        this.draft,
        NONE_GROUP_ROLE,
        withAdmission(this.permissionsOf(NONE_GROUP_ROLE), state),
      )
    },
    /**
     * What the cursor is pointing at, as `{ roleName: [permissionKey] }`.
     *
     * One sentence here stands for one right on one role, and the matrix below states the same
     * thing in the catalog's own vocabulary. Saying which is which costs a hover: the page marks
     * the rows AND the role tab the sentence reaches, so the two views stop being two unrelated
     * lists of the same facts. Emitted rather than rendered here — what the mark looks like
     * belongs to whatever is showing the rights.
     */
    highlightSwitch(item) {
      this.$emit('highlight', { [item.role]: rightsTouchedBy(item.permission) })
    },
    /**
     * Both join rights, whichever of the three the cursor is on: picking a state REWRITES the
     * pair (see `withAdmission`), so "closed" is as much about `group.join` as "open" is.
     */
    highlightAdmission() {
      this.$emit('highlight', { [NONE_GROUP_ROLE]: [...JOIN_RIGHTS] })
    },
    clearHighlight() {
      this.$emit('highlight', null)
    },
    resetDraft() {
      this.draft = {}
    },
    save() {
      this.$emit('save', this.changes)
    },
  },
}
</script>

<style scoped>
/*
 * Two halves, the way the sentences below are two columns: on the left what the group IS, each
 * statement with its glyph; on the right what SETS those two, as a labelled block of its own.
 *
 * The controls do NOT line up with the pictures. They used to, and then the longer of the two
 * statements pushed its row of buttons down and the two rows stopped reading as one list — the
 * row of buttons is a list of choices, so it starts at the top of the box and stacks.
 */
.states {
  display: grid;
  gap: var(--space-base) var(--space-large);
  margin-bottom: var(--space-large);

  @media (--vp-desktop-up) {
    grid-template-columns: 1fr 1fr;
  }
}

/* One rhythm for both halves, so a block on the left and a block on the right sit the same
   distance apart — the two used to be spaced by whatever their contents happened to be. */
.states__facts,
.states__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-large);
  align-self: start;
}

/* Top-aligned, not centred: the glyph belongs beside the first line of what it illustrates. A
   centred icon drifted half a statement down as soon as the description wrapped to four lines. */
.state {
  display: flex;
  align-items: flex-start;
  gap: var(--space-base);
}

/* The heading stands ABOVE its buttons, like the headings over the sentences below. Beside
   them it read as a first, unclickable option in the row. */
.state__control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xx-small);
}

.state__control-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xx-small);
}

.state__control-label {
  color: var(--text-color-softer);
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/*
 * OsIcon sizes itself in `em` (ICON_SIZES), so a width/height in pixels here was simply ignored
 * and the glyph came out at text size. The font-size is the handle; `2xl` is 2.5em of it.
 */
.state__icon {
  flex: 0 0 auto;
  font-size: 1.6rem;
  color: var(--text-color-soft);
}

.state__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxx-small);
}

/* The same pill the template tabs are, so the two rows read as the same kind of choice. */
.admission-option {
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-x-large);
  background: var(--background-color-base);
  color: var(--text-color-base);
  padding: var(--space-xx-small) var(--space-small);
  font-size: 0.9em;
  line-height: 1.4;
  cursor: pointer;
}

.admission-option:hover:not(:disabled) {
  background: var(--background-color-softer);
}

.admission-option--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  font-weight: bold;
}

/* Not the soft hover of an inactive pill: white on a light background is unreadable. */
.admission-option--active:hover:not(:disabled) {
  background: var(--color-primary);
}

.admission-option:disabled {
  cursor: not-allowed;
}

/*
 * Greyed only while there is something to tell it apart FROM. On a hidden group the other two
 * are not rendered at all, and fading the one that is left put white text on a washed-out green
 * — the reason is already spelled out under the title, so the pill only has to stay readable.
 */
.admission-option:disabled:not(.admission-option--active) {
  opacity: 0.6;
}

/* Side by side on a wide screen, like the full matrix — eight sentences in one column is a
   longer scroll than it is a thought. */
.switch-groups {
  @media (--vp-desktop-up) {
    column-count: 2;
    column-gap: var(--space-large);
  }
}

.switch-group {
  border: none;
  padding: 0;
  margin: 0 0 var(--space-base);
  /* Keep a heading with its sentences rather than splitting them across the two columns. */
  break-inside: avoid;
}

.switch-group__title {
  color: var(--text-color-soft);
  font-weight: bold;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.switches {
  list-style: none;
  padding: 0;
  margin: 0;
}

.switch {
  margin: var(--space-x-small) 0;
}

.switch label {
  display: flex;
  align-items: baseline;
  gap: var(--space-x-small);
  cursor: pointer;
}

.switch--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-small);
  margin-top: var(--space-base);
}
</style>

<template>
  <!--
    The handful of questions a group actually asks itself, as sentences — and above them, the two
    things those answers MAKE the group: how far it can be seen, and how somebody gets in.

    One component for both levels: a group editing its own rights, and the admin editing the
    template new groups start from. Both states are derived from the same non-member role in both
    places, so stating them in two implementations is how the two came to disagree.

    Edits are a DRAFT, and the draft is the PAGE's: the matrix under this edits the same roles,
    and one draft for both is what lets a tick in either show up in the other. This component
    shows the roles it is handed and says what it would change — the page decides when that is
    written. A single tick here can open a group to the whole network, and that is too much to
    happen on the way past.
  -->
  <div class="simple-rights">
    <!--
      Two columns, one per state, each with its control above it: the template decides how far
      the group can be seen, the door how somebody gets in. One grid rather than two stacks, so
      the two states always start on the same line — however many rows the template buttons
      wrap into.
    -->
    <div class="overview">
      <div class="template-control">
        <span class="control-label">{{ $t('admin.groupRoles.templateLabel') }}</span>
        <slot name="template-control" />
      </div>

      <!--
        Three states of ONE question, so one control with three positions rather than three
        checkboxes: two ticks would let somebody express "anybody may enter AND must ask", which
        the model has no answer for. A row of buttons rather than a dropdown: all three answers
        are readable at once, which matters for a setting whose options are opposite ends of one
        scale.
      -->
      <div class="admission-control" role="radiogroup" :aria-label="$t('group.admission.label')">
        <span class="control-label">{{ $t('group.admission.label') }}</span>
        <div class="control-options">
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
            @mouseenter="previewAdmission(state)"
            @mouseleave="clearPreview"
          >
            {{ $t(`group.admission.${state}.title`) }}
          </button>
        </div>
      </div>

      <!-- What the group IS, on the same card the create form offers its templates on — so the
           state reads as the choice it came from — saying what it would become while something
           under the cursor would change it. -->
      <group-state-card
        class="state state--visibility"
        :class="{ 'state--changes': nextVisibility }"
        :icon="icons[visibilityIcon]"
        :data-test="`visibility-${visibility}`"
      >
        <template #caption>{{ caption }}</template>
        <template #title>
          <span data-test="visibility-title">{{ $t(`group.types.${visibility}`) }}</span>
          <span v-if="nextVisibility" class="state__next" data-test="visibility-next">
            → {{ $t(`group.types.${nextVisibility}`) }}
          </span>
        </template>
        <span data-test="visibility-description">
          {{ $t(`group.typeDescriptions.${visibility}`) }}
        </span>
      </group-state-card>

      <group-state-card
        class="state state--admission"
        :class="{ 'state--changes': nextAdmission }"
        :icon="icons[admissionIcon]"
        :data-test="`admission-${admission}`"
      >
        <template #caption>{{ $t('group.admission.caption') }}</template>
        <template #title>
          <span data-test="admission-title">{{ $t(`group.admission.${admission}.title`) }}</span>
          <span v-if="nextAdmission" class="state__next" data-test="admission-next">
            → {{ $t(`group.admission.${nextAdmission}.title`) }}
          </span>
        </template>
        <span data-test="admission-description">
          {{ $t(`group.admission.${admission}.description`) }}
        </span>
        <span v-if="admissionLocked" class="state__reason" data-test="admission-locked">
          {{ $t('group.admission.needsVisibility') }}
        </span>
      </group-state-card>
    </div>

    <!-- Grouped by WHO the sentence is about, because that is the order somebody reads them
         in: what members may do, then what the people waiting see, then what everybody else
         sees. Eight sentences in one list made the reader find that grouping themselves. -->
    <div class="switch-groups">
      <fieldset
        v-for="group in switchGroups"
        :key="group.name"
        class="switch-group"
        :class="{ 'switch-group--changes': group.changes }"
        :data-test="`switch-group-${group.name}`"
      >
        <legend class="switch-group__title">
          {{ $t(`group.rights.simpleGroups.${group.name}`) }}
        </legend>
        <ul class="switches">
          <li
            v-for="item in group.items"
            :key="item.id"
            class="switch"
            :class="item.change && `switch--will-${item.change}`"
            :data-test="`switch-row-${item.id}`"
            @mouseenter="previewSwitch(item)"
            @mouseleave="clearPreview"
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
  </div>
</template>

<script>
import GroupStateCard from '~/components/Group/GroupStateCard'
import { NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { ADMISSION_STATES, admissionOf, JOIN_RIGHTS, withAdmission } from '~/utils/groupAdmission'
import { privacyLevelOf } from '~/utils/groupPrivacyLevel'
import { applyRightChange, rightsTouchedBy } from '~/utils/groupRoleRights'
import { iconRegistry } from '~/utils/iconRegistry'
import { samePermissions } from '~/utils/permissionDiff'

// Which heading each sentence belongs under, and whose rights the heading is about — the role a
// sentence is about, read as a group of people rather than as a role key. The order is the
// reading order: what members may do, then what applicants see, then what outsiders see.
const SWITCH_GROUPS = [
  { name: 'members', role: USUAL_GROUP_ROLE },
  { name: 'applicants', role: PENDING_GROUP_ROLE },
  { name: 'outsiders', role: NONE_GROUP_ROLE },
]

// Declared rather than hand-written per row: one sentence, one role, one right.
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

const permissionsIn = (roles, name) => roles.find((role) => role.name === name)?.permissions ?? []

/**
 * What a sentence would go through, read from how it stands now and how it would stand after:
 * ticked or unticked first — that is the change somebody is about to make — and otherwise
 * opened or closed for editing, which is what the door does to the applicant sentence.
 */
const changeBetween = (now, next) => {
  if (now.enabled !== next.enabled) return next.enabled ? 'added' : 'removed'
  if (now.editable !== next.editable) return next.editable ? 'enabled' : 'disabled'
  return null
}

export default {
  name: 'GroupRightsSimple',
  components: { GroupStateCard },
  props: {
    /** The group's (or template's) roles AS DRAFTED: `{ name, permissions, … }`. */
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
    /**
     * The roles as they would be after whatever the page has under the cursor — a template
     * button, a matrix row — or null. Every sentence and state that would change says how.
     */
    preview: { type: Array, default: null },
  },
  data() {
    return {
      icons: iconRegistry,
      admissionStates: ADMISSION_STATES,
      /** The same, for this component's own controls under the cursor. */
      ownPreview: null,
    }
  },
  computed: {
    /** What the cursor would do, wherever it is. */
    previewRoles() {
      return this.ownPreview ?? this.preview
    },
    /**
     * What the group would be with the roles as handed in, read off the rights its NON-MEMBER
     * role holds — the same two the backend derives it from.
     */
    visibility() {
      return privacyLevelOf(this.permissionsOf(NONE_GROUP_ROLE))
    },
    admission() {
      return admissionOf(this.permissionsOf(NONE_GROUP_ROLE))
    },
    /** What the visibility would become, where the preview changes it. */
    nextVisibility() {
      if (!this.previewRoles) return null
      const next = privacyLevelOf(permissionsIn(this.previewRoles, NONE_GROUP_ROLE))
      return next === this.visibility ? null : next
    },
    nextAdmission() {
      if (!this.previewRoles) return null
      const next = admissionOf(permissionsIn(this.previewRoles, NONE_GROUP_ROLE))
      return next === this.admission ? null : next
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
      const now = this.switchesOf(this.roles)
      const next = this.previewRoles && this.switchesOf(this.previewRoles)
      return now.map((item, index) => ({
        ...item,
        change: next ? changeBetween(item, next[index]) : null,
      }))
    },
    /**
     * The sentences under their heading, in the order the headings are declared.
     *
     * A heading says so where the preview changes its role in a way none of its sentences can
     * show — a template changing a right that has no sentence.
     */
    switchGroups() {
      return SWITCH_GROUPS.map(({ name, role }) => {
        const items = this.switches.filter((item) => item.group === name)
        const changes =
          !!this.previewRoles &&
          !items.some((item) => item.change) &&
          !samePermissions(this.permissionsOf(role), permissionsIn(this.previewRoles, role))
        return { name, items, changes }
      }).filter((group) => group.items.length > 0)
    },
  },
  methods: {
    /** Every sentence as it stands for these roles: ticked, editable, and why not. */
    switchesOf(roles) {
      const admission = admissionOf(permissionsIn(roles, NONE_GROUP_ROLE))
      return SIMPLE_SWITCHES.map((item) => {
        const role = roles.find((candidate) => candidate.name === item.role)
        const permission = this.catalog.find((entry) => entry.key === item.permission)
        const allowed = !!role && !!permission && this.grantable(permission)
        const moot = this.mootReasonFor(item, admission)
        return {
          ...item,
          enabled: permissionsIn(roles, item.role).includes(item.permission),
          editable: allowed && !this.disabled && !moot,
          // The reason it cannot be answered comes first: "you may not grant this" is true of a
          // locked row too, and the more specific answer is the useful one.
          hint: moot || this.hintFor(permission) || (this.disabled ? this.disabledHint : null),
        }
      })
    },
    /**
     * Why a sentence has nothing to decide, or null.
     *
     * Today only the applicant ones: a role nobody can hold answers no question. Read off the
     * door of the roles in question, so choosing "anybody may walk in" greys the applicant row
     * under the cursor instead of one save later — and hovering that choice shows it coming.
     */
    mootReasonFor(item, admission) {
      if (item.role !== PENDING_GROUP_ROLE) return null
      return admission === 'onRequest' ? null : this.$t('group.rights.pendingBlocked')
    },
    roleNamed(name) {
      return this.roles.find((role) => role.name === name)
    },
    permissionsOf(name) {
      return permissionsIn(this.roles, name)
    },
    /** These roles with one of them changed. */
    rolesWith(name, permissions) {
      return this.roles.map((role) => (role.name === name ? { ...role, permissions } : role))
    },
    toggle(item, enabled) {
      // Through the coupling: ticking "outsiders may read the posts" also grants the right to
      // see the group at all, and unticking that one takes the posts with it.
      this.$emit(
        'change',
        item.role,
        applyRightChange(this.permissionsOf(item.role), item.permission, enabled),
      )
    },
    setAdmission(state) {
      this.$emit(
        'change',
        NONE_GROUP_ROLE,
        withAdmission(this.permissionsOf(NONE_GROUP_ROLE), state),
      )
    },
    /**
     * The cursor on a sentence: what a click would do — the tick itself and whatever the
     * coupling drags along — and, for the page, the rights it stands for in the matrix.
     */
    previewSwitch(item) {
      this.ownPreview = item.editable
        ? this.rolesWith(
            item.role,
            applyRightChange(this.permissionsOf(item.role), item.permission, !item.enabled),
          )
        : null
      this.$emit('highlight', { [item.role]: rightsTouchedBy(item.permission) })
    },
    /**
     * The cursor on a door: what picking it would do — which reaches further than the door
     * itself, since the applicant sentence only means something behind one that asks. For the
     * page, both join rights (picking a state REWRITES the pair) and the applicant role.
     */
    previewAdmission(state) {
      this.ownPreview =
        this.admissionEditable && state !== this.admission
          ? this.rolesWith(
              NONE_GROUP_ROLE,
              withAdmission(this.permissionsOf(NONE_GROUP_ROLE), state),
            )
          : null
      this.$emit('highlight', { [NONE_GROUP_ROLE]: [...JOIN_RIGHTS], [PENDING_GROUP_ROLE]: [] })
    },
    clearPreview() {
      this.ownPreview = null
      this.$emit('highlight', null)
    },
  },
}
</script>

<style scoped>
.simple-rights {
  display: flex;
  flex-direction: column;
  gap: var(--space-large);
}

/*
 * Control above its state, the two pairs side by side. One grid, so row two starts at the same
 * height in both columns however far either control wraps; on a phone the pairs stack.
 */
.overview {
  display: grid;
  gap: var(--space-small) var(--space-large);
  grid-template-areas: 'template' 'visibility' 'door-control' 'door';

  @media (--vp-desktop-up) {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'template door-control'
      'visibility door';
  }
}

.template-control {
  grid-area: template;
}

.admission-control {
  grid-area: door-control;
}

.state--visibility {
  grid-area: visibility;
}

.state--admission {
  grid-area: door;
}

/* The heading stands ABOVE its buttons, like the headings over the sentences below. Beside
   them it read as a first, unclickable option in the row. */
.template-control,
.admission-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xx-small);
}

.control-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xx-small);
}

.control-label {
  color: var(--text-color-softer);
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* The cards are GroupStateCard's; here only where they sit and the mark they get. */
.state {
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline-color 0.1s ease;
}

/* Something under the cursor would change it — the line beside the title says into what. */
.state--changes {
  outline-color: var(--color-primary);
}

.state__next {
  color: var(--color-primary);
  white-space: nowrap;
}

/* The reason a door cannot be set, as its own line under the description. */
.state__reason {
  display: block;
  margin-top: var(--space-xxx-small);
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

/* A right of this role would change, but none that a sentence here names. */
.switch-group--changes .switch-group__title {
  color: var(--color-primary);
}

.switches {
  list-style: none;
  padding: 0;
  margin: 0;
}

/*
 * What a click under the cursor would do to this sentence, in the matrix's own marks: a bar on
 * the left, green for ticked, red for unticked — and dashed where the box is not ticked but
 * opened (green) or closed (grey) for editing. Reserved up front, so a mark moves nothing.
 */
.switch {
  margin: var(--space-xxx-small) 0;
  padding: var(--space-xxx-small) var(--space-xx-small);
  border-left: 3px solid transparent;
  border-radius: var(--border-radius-small);
  transition: background-color 0.1s ease;
}

.switch--will-added {
  border-left-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 14%, transparent);
}

.switch--will-removed {
  border-left-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 14%, transparent);
}

.switch--will-enabled {
  border-left: 3px dashed var(--color-success);
}

.switch--will-disabled {
  border-left: 3px dashed var(--text-color-disabled);
  background: var(--background-color-softer);
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
</style>

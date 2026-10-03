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
      Each state with its own control directly above it: what sets the thing stands over the
      thing it sets, rather than in a row of buttons further down that one has to connect back
      to the right card by eye.
    -->
    <div class="states">
      <div class="state" :data-test="`visibility-${visibility}`">
        <!-- The page's own way of setting this — the template tabs in the admin area. -->
        <div v-if="$slots['visibility-control']" class="state__control">
          <slot name="visibility-control" />
        </div>
        <div class="state__body">
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
      </div>

      <div class="state" :data-test="`admission-${admission}`">
        <!--
          Three states of ONE question, so one control with three positions rather than three
          checkboxes: two ticks would let somebody express "anybody may enter AND must ask",
          which the model has no answer for.

          A row of buttons rather than a dropdown: all three answers are readable at once, which
          matters for a setting whose options are opposite ends of one scale.
        -->
        <div class="state__control" role="radiogroup" :aria-label="$t('group.admission.label')">
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
          >
            {{ $t(`group.admission.${state}.title`) }}
          </button>
        </div>
        <div class="state__body">
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
    </div>

    <ul class="switches">
      <li v-for="item in switches" :key="item.id" class="switch">
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
import { ADMISSION_STATES, admissionOf, withAdmission } from '~/utils/groupAdmission'
import { privacyLevelOf } from '~/utils/groupPrivacyLevel'
import { applyRightChange } from '~/utils/groupRoleRights'
import { iconRegistry } from '~/utils/iconRegistry'

// Declared rather than hand-written per row: one sentence, one role, one right. The order is the
// reading order — what members may do, then what applicants see, then what outsiders see.
const SIMPLE_SWITCHES = [
  { id: 'members-post', role: USUAL_GROUP_ROLE, permission: 'group.post.create' },
  { id: 'members-comment', role: USUAL_GROUP_ROLE, permission: 'group.comment.create' },
  { id: 'members-chat', role: USUAL_GROUP_ROLE, permission: 'group.chat.participate' },
  { id: 'members-invite', role: USUAL_GROUP_ROLE, permission: 'group.invite' },
  { id: 'applicants-read', role: PENDING_GROUP_ROLE, permission: 'group.content.read' },
  // The hinge of the whole visibility: without `group.read` on the non-member role a group is
  // hidden no matter what else is ticked.
  { id: 'nonmembers-profile', role: NONE_GROUP_ROLE, permission: 'group.read' },
  { id: 'nonmembers-read', role: NONE_GROUP_ROLE, permission: 'group.content.read' },
  { id: 'nonmembers-members', role: NONE_GROUP_ROLE, permission: 'group.members.read' },
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
        return {
          ...item,
          enabled: this.permissionsOf(item.role).includes(item.permission),
          editable: allowed && !this.disabled,
          hint: this.hintFor(permission) || (this.disabled ? this.disabledHint : null),
        }
      })
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
.states {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-large);
  margin-bottom: var(--space-base);
}

.state {
  display: flex;
  flex-direction: column;
  gap: var(--space-x-small);
  flex: 1 1 18rem;
}

/* The control stands over what it sets. Reserved height even when a page passes no slot, so
   the two columns' icons stay on one line. */
.state__control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xx-small);
  min-height: 2rem;
}

.state__body {
  display: flex;
  align-items: center;
  gap: var(--space-base);
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
}

.state__caption {
  margin: 0;
  color: var(--text-color-softer);
  font-size: 0.85em;
}

.state__title {
  font-size: 1.1em;
}

.state__description {
  margin: 0;
  color: var(--text-color-soft);
  font-size: 0.9em;
}

.state__reason {
  margin: 0;
  color: var(--text-color-softer);
  font-size: 0.85em;
  font-style: italic;
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
  opacity: 0.6;
  cursor: not-allowed;
}

.switches {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-base);
}

.switch {
  margin: var(--space-xx-small) 0;
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
  gap: var(--space-x-small);
}
</style>

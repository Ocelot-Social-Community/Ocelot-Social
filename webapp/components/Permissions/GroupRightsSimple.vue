<template>
  <!--
    The handful of questions a group actually asks itself, as sentences — and above them, what
    those answers MAKE the group.

    One component for both levels: a group editing its own rights, and the admin editing the
    template new groups start from. The visibility is derived from the same two rights in both
    places, so stating it in two implementations is how the two came to disagree.
  -->
  <div class="simple-rights">
    <div class="visibility" :data-test="`visibility-${visibility}`">
      <os-icon :icon="icons[iconName]" size="2xl" class="visibility__icon" aria-hidden="true" />
      <div class="visibility__text">
        <p class="visibility__caption">{{ caption }}</p>
        <strong class="visibility__title" data-test="visibility-title">
          {{ $t(`group.types.${visibility}`) }}
        </strong>
        <p class="visibility__description" data-test="visibility-description">
          {{ $t(`group.typeDescriptions.${visibility}`) }}
        </p>
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
            @change="$emit('toggle', item.role, item.permission, $event.target.checked)"
          />
          <span>{{ $t(`group.rights.simple.${item.id}`) }}</span>
        </label>
      </li>
    </ul>

    <!-- A role nobody can reach is a setting that does nothing. Said rather than hidden: the
         applicant rights stay editable, because enabling the request is one tick away. -->
    <p v-if="!anyoneMayRequestToJoin" class="note" data-test="no-applicants-note">
      {{ $t('group.rights.noApplicants') }}
    </p>

    <!-- The buttons differ per level — a group resets to defaults, the admin applies to groups. -->
    <slot name="actions" />
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'
import { privacyLevelOf } from '~/utils/groupPrivacyLevel'
import { iconRegistry } from '~/utils/iconRegistry'

// Declared rather than hand-written per row: one sentence, one role, one right. The order is the
// reading order — what members may do, then what applicants see, then what outsiders see.
const SIMPLE_SWITCHES = [
  { id: 'members-post', role: USUAL_GROUP_ROLE, permission: 'group.post.create' },
  { id: 'members-comment', role: USUAL_GROUP_ROLE, permission: 'group.comment.create' },
  { id: 'members-chat', role: USUAL_GROUP_ROLE, permission: 'group.chat.participate' },
  { id: 'members-invite', role: USUAL_GROUP_ROLE, permission: 'group.invite' },
  { id: 'applicants-read', role: PENDING_GROUP_ROLE, permission: 'group.content.read' },
  // The hinge of the whole visibility, and it was missing: without `group.read` on the
  // non-member role a group is hidden no matter what else is ticked, so the simple view could
  // produce nothing but secret groups — every box ticked and still "Secret".
  { id: 'nonmembers-profile', role: NONE_GROUP_ROLE, permission: 'group.read' },
  { id: 'nonmembers-read', role: NONE_GROUP_ROLE, permission: 'group.content.read' },
  { id: 'nonmembers-members', role: NONE_GROUP_ROLE, permission: 'group.members.read' },
]

// One glyph per visibility, from the icons the app already ships: the world may see it, it is
// locked, or it is not there to be seen.
const VISIBILITY_ICONS = {
  public: 'globe',
  closed: 'lock',
  hidden: 'eyeSlash',
}

export default {
  name: 'GroupRightsSimple',
  components: { OsIcon },
  props: {
    /** The group's (or template's) role definitions: `{ name, permissions, … }`. */
    roles: { type: Array, required: true },
    /** The group permission catalog, for the gate and prerequisite hints. */
    catalog: { type: Array, required: true },
    /** The sentence above the visibility — what the group IS, or what new groups WILL BE. */
    caption: { type: String, required: true },
    /** Nothing is editable: no right to edit, a save in flight, an unsaved draft elsewhere. */
    disabled: { type: Boolean, default: false },
    /** Why nothing is editable, shown on every row while `disabled`. */
    disabledHint: { type: String, default: null },
    /** Whether the viewer may grant this catalog entry at all. */
    grantable: { type: Function, default: () => true },
    /** Why a single row cannot be ticked — a closed gate, a missing network right. */
    hintFor: { type: Function, default: () => null },
  },
  data() {
    return { icons: iconRegistry }
  },
  computed: {
    /**
     * What the group is, read off the rights its NON-MEMBER role holds — the same two the
     * backend derives it from. Said while the boxes are still being ticked, not after saving.
     */
    visibility() {
      return privacyLevelOf(this.roleNamed(NONE_GROUP_ROLE)?.permissions)
    },
    iconName() {
      return VISIBILITY_ICONS[this.visibility]
    },
    /**
     * Whether anybody can become an applicant at all. Nothing grants `group.join.request` ⇒ the
     * `pending` role is never held, and every right on it is inert.
     */
    anyoneMayRequestToJoin() {
      return this.roles.some((role) => role.permissions?.includes('group.join.request'))
    },
    switches() {
      return SIMPLE_SWITCHES.map((item) => {
        const role = this.roleNamed(item.role)
        const permission = this.catalog.find((entry) => entry.key === item.permission)
        const allowed = !!role && !!permission && this.grantable(permission)
        return {
          ...item,
          enabled: !!role?.permissions.includes(item.permission),
          editable: allowed && !this.disabled,
          hint: this.hintFor(permission) || (this.disabled ? this.disabledHint : null),
        }
      })
    },
  },
  methods: {
    roleNamed(name) {
      return this.roles.find((role) => role.name === name)
    },
  },
}
</script>

<style scoped>
.visibility {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  margin-bottom: var(--space-base);
}

/*
 * OsIcon sizes itself in `em` (ICON_SIZES), so a width/height in pixels here was simply ignored
 * and the glyph came out at text size. The font-size is the handle; `2xl` is 2.5em of it.
 */
.visibility__icon {
  flex: 0 0 auto;
  font-size: 1.6rem;
  color: var(--text-color-soft);
}

.visibility__text {
  display: flex;
  flex-direction: column;
}

.visibility__caption {
  margin: 0;
  color: var(--text-color-softer);
  font-size: 0.85em;
}

.visibility__title {
  font-size: 1.1em;
}

.visibility__description {
  margin: 0;
  color: var(--text-color-soft);
  font-size: 0.9em;
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

.note {
  margin: 0 0 var(--space-base);
  color: var(--text-color-softer);
  font-size: 0.85em;
  font-style: italic;
}
</style>

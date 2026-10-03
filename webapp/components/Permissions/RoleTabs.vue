<template>
  <!--
    The pill row every rights screen is steered with: network roles, a group's own roles and
    the per-type role templates. One component, so the three cannot drift apart in look or in
    behaviour — the hover that previews a role's difference is part of the contract, not
    something each page remembers to add.
  -->
  <div class="role-tabs" data-test="role-tabs">
    <button
      v-for="role in roles"
      :key="role.name"
      type="button"
      class="role-tab"
      :class="{
        'role-tab--active': role.name === activeName,
        'role-tab--touched': highlightFor(role),
      }"
      :disabled="!!blockedFor(role)"
      :title="blockedFor(role)"
      :data-test="`role-tab-${role.name}`"
      @click="$emit('select', role.name)"
      @mouseenter="$emit('hover', role.name)"
      @mouseleave="$emit('hover', null)"
    >
      {{ labelFor(role) }}
      <!--
        A role nobody may reshape: the network's `owner`, a group's system roles. An icon with an
        `aria-label` rather than the `★` with a `title` this was — a title on a span reaches a
        sighted mouse user and nobody else, and the star said nothing about WHY the role is
        special. OsIcon turns the label into `role="img"` and hides the glyph when there is none.
      -->
      <os-icon
        v-if="badgeFor(role)"
        :icon="icons.lock"
        :aria-label="badgeTitle"
        class="role-tab__badge"
      />
      <!-- An unsaved edit on a role one has moved away from: the draft keeps it, the tab says so. -->
      <span
        v-if="draftedFor(role)"
        class="role-tab__drafted"
        role="img"
        :aria-label="draftedTitle"
        :title="draftedTitle"
        :data-test="`role-tab-drafted-${role.name}`"
      />
    </button>

    <!-- Whatever the page adds at the end of the row: an add button, an inline name input. -->
    <slot name="extra" />
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'RoleTabs',
  components: { OsIcon },
  props: {
    roles: { type: Array, required: true },
    activeName: { type: String, default: null },
    /**
     * How a role READS here — its own label, a translation, or the bare key.
     *
     * Required, like `badgeFor` and for the same reason: it used to default to the key, the
     * group's rights page overrode it with the translated name and the template page did not,
     * so the same five roles were called "Mitglied" on one screen and `usual` on the other.
     * A default here is an invitation for two screens to disagree quietly.
     */
    labelFor: { type: Function, required: true },
    /**
     * Which roles are FIXED — cannot be renamed or deleted — and so carry the lock.
     *
     * Required, with no default on purpose. It used to default to `role.protected`, which the
     * group rights page overrode with `role.system` and the two admin pages did not: the same
     * row of tabs then showed five locks on one screen and one on another, for roles that are
     * equally fixed. The two role models answer this differently (group roles have `system`,
     * network roles only `protected`), so the answer belongs to the caller — but it has to be
     * given rather than inherited by accident.
     */
    badgeFor: { type: Function, required: true },
    badgeTitle: { type: String, default: null },
    /**
     * Why this role cannot be opened at all, or null. A role nobody can hold has nothing to
     * configure, and a tab that opens onto an explanation is a worse way of saying that than a
     * tab that says it where the cursor already is.
     */
    blockedFor: { type: Function, default: () => null },
    /**
     * Which roles something elsewhere on the page is pointing at. A sentence like "members may
     * write posts" names a role as well as a right, and the row of tabs is where that role is —
     * so the tab says "this one" rather than leaving it to be worked out from the wording.
     */
    highlightFor: { type: Function, default: () => false },
    /** Which roles hold an unsaved edit. */
    draftedFor: { type: Function, default: () => false },
    draftedTitle: { type: String, default: null },
  },
  data() {
    return { icons: iconRegistry }
  },
}
</script>

<style scoped>
.role-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-x-small);
  padding-bottom: var(--space-small);
  border-bottom: 1px solid var(--border-color-softer);
}

.role-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xxx-small);
  padding: var(--space-xx-small) var(--space-small);
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-x-large);
  background: var(--background-color-base);
  color: var(--text-color-base);
  font-size: 0.9em;
  line-height: 1.4;
  cursor: pointer;
}

.role-tab__drafted {
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  background: var(--color-warning);
}

.role-tab:hover:not(:disabled) {
  background: var(--background-color-softer);
}

.role-tab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/*
 * An outline rather than a colour, so it reads the same on the active tab (already filled with
 * the primary colour) and on an inactive one.
 */
.role-tab--touched {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.role-tab--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  font-weight: bold;
}

.role-tab--active:hover {
  background: var(--color-primary);
}

.role-tab__badge {
  font-size: 0.8em;
}
</style>

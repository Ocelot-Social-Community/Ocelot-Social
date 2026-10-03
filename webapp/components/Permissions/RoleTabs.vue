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
      :class="{ 'role-tab--active': role.name === activeName }"
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

.role-tab:hover {
  background: var(--background-color-softer);
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

<template>
  <!--
    The pill row every rights screen is steered with: network roles, a group's own roles and
    the per-type role templates. One component, so the three cannot drift apart in look or in
    behaviour — the hover that previews a role's difference is part of the contract, not
    something each page remembers to add.
  -->
  <div class="role-tabs" data-test="role-tabs">
    <toggle-group
      :items="items"
      :value="activeName"
      :label="label"
      @select="$emit('select', $event)"
      @hover="$emit('hover', $event)"
    >
      <template #extra="{ item }">
        <!--
          A role nobody may reshape: the network's `owner`, a group's system roles. An icon with
          an `aria-label` rather than the `★` with a `title` this was — a title on a span reaches
          a sighted mouse user and nobody else, and the star said nothing about WHY the role is
          special. OsIcon turns the label into `role="img"` and hides the glyph when there is none.
        -->
        <os-icon
          v-if="badgeFor(item.role)"
          :icon="icons.lock"
          :aria-label="badgeTitle"
          class="role-tab__badge"
        />
        <!-- An unsaved edit on this role: the draft keeps it across tabs, the tab says so. -->
        <span
          v-if="draftedFor(item.role)"
          class="role-tab__drafted"
          role="img"
          :aria-label="draftedTitle"
          :title="draftedTitle"
          :data-test="`role-tab-drafted-${item.value}`"
        />
      </template>
    </toggle-group>

    <!-- Whatever the page adds at the end of the row: an add button, an inline name input. -->
    <slot name="extra" />
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import ToggleGroup from '~/components/Permissions/ToggleGroup'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'RoleTabs',
  components: { OsIcon, ToggleGroup },
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
    /** What the row as a whole chooses, for assistive tech. */
    label: { type: String, default: null },
  },
  data() {
    return { icons: iconRegistry }
  },
  computed: {
    items() {
      return this.roles.map((role) => ({
        value: role.name,
        label: this.labelFor(role),
        disabled: !!this.blockedFor(role),
        title: this.blockedFor(role),
        marked: this.highlightFor(role),
        testId: `role-tab-${role.name}`,
        role,
      }))
    },
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

.role-tab__badge {
  font-size: 0.9em;
}

.role-tab__drafted {
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  background: var(--color-warning);
}
</style>

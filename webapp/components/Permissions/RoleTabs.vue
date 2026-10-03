<template>
  <!--
    The row of roles a rights screen is steered with, one button per role. A component of its
    own so every screen that edits roles gets the same one — the hover that previews a role's
    difference is part of the contract, not something each page remembers to add.
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
     * How a role READS here — its own label, a translation, or the bare key. Required: a default
     * is an invitation for two screens to name the same role differently without noticing.
     */
    labelFor: { type: Function, required: true },
    /**
     * Which roles are FIXED — cannot be renamed or deleted — and so carry the lock. Required for
     * the same reason: which field says so depends on the role model, so the caller answers.
     */
    badgeFor: { type: Function, required: true },
    badgeTitle: { type: String, default: null },
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
</style>

<template>
  <!--
    The permission matrix of one role: the catalog grouped by its own `group` field, one row
    per right, two columns on desktop. Shared by the network roles page, a group's rights and
    the group role templates so a right reads the same wherever it is granted.

    Presentational on purpose — it owns no state. The page says which rights are granted, which
    are disabled and what differs; this decides how that looks. The row under the cursor is
    reported (`hover`), so a page can point at whatever else on it that right decides.
  -->
  <div class="perm-groups">
    <fieldset v-for="group in grouped" :key="group.name" class="perm-group">
      <legend class="perm-group__title">{{ groupLabel(group.name) }}</legend>
      <label
        v-for="permission in group.permissions"
        :key="permission.key"
        class="perm-row"
        :class="{
          'perm-row--added': diff[permission.key] === 'added',
          'perm-row--removed': diff[permission.key] === 'removed',
          'perm-row--unavailable': disabledFor(permission),
          'perm-row--touched': highlight.includes(permission.key),
        }"
        :title="hintFor(permission)"
        @mouseenter="$emit('hover', permission.key)"
        @mouseleave="$emit('hover', null)"
      >
        <input
          type="checkbox"
          :checked="granted.includes(permission.key)"
          :disabled="disabledFor(permission)"
          :data-test="`${testPrefix}${permission.key}`"
          @change="$emit('toggle', permission.key, $event.target.checked)"
        />
        <span class="perm-row__text">
          <span class="perm-row__key">{{ permission.key }}</span>
          <span class="perm-row__desc">{{ descriptionFor(permission) }}</span>
          <span v-if="noteFor(permission)" class="perm-row__note">
            {{ noteFor(permission) }}
            <!-- Whatever the page wants to offer about this row: a link to the gate's policy. -->
            <slot name="note" :permission="permission" />
          </span>
        </span>
      </label>
    </fieldset>
  </div>
</template>

<script>
export default {
  name: 'PermissionMatrix',
  props: {
    /** The catalog entries to show: `{ key, group, description, … }`. */
    permissions: { type: Array, required: true },
    /** The keys the edited role currently holds. */
    granted: { type: Array, default: () => [] },
    /** key → 'added' | 'removed', for the hover and conflict previews. */
    diff: { type: Object, default: () => ({}) },
    /**
     * Keys to mark as "this is what is meant", without saying added or removed — what a simple
     * sentence somewhere else on the page stands for, in the catalog's own vocabulary.
     */
    highlight: { type: Array, default: () => [] },
    /** Which rows cannot be ticked — an ungranted feature, a protected role, a missing right. */
    disabledFor: { type: Function, default: () => false },
    /** The row's `title`, for saying WHY it cannot be ticked. */
    hintFor: { type: Function, default: () => null },
    /** A short note under the row, in the warning colour. */
    noteFor: { type: Function, default: () => null },
    /** How the catalog's group names are translated. */
    groupLabel: { type: Function, default: (name) => name },
    /** What the row says about the right; the catalog's description unless a page knows better. */
    descriptionFor: { type: Function, default: (permission) => permission.description },
    /** Prefix for the rows' `data-test`, so a page keeps the ids its tests already use. */
    testPrefix: { type: String, default: 'perm-' },
  },
  computed: {
    // Grouped here rather than by every caller: the catalog's own `group` field is the grouping,
    // and first-seen order is the order the catalog declares.
    grouped() {
      const groups = []
      for (const permission of this.permissions) {
        let group = groups.find((candidate) => candidate.name === permission.group)
        if (!group) {
          group = { name: permission.group, permissions: [] }
          groups.push(group)
        }
        group.permissions.push(permission)
      }
      return groups
    },
  },
}
</script>

<style scoped>
.perm-groups {
  @media (--vp-desktop-up) {
    column-count: 2;
    column-gap: var(--space-large);
  }
}

.perm-group {
  border: none;
  padding: 0;
  margin: var(--space-x-small) 0;
  /* Keep a group (title + its rows) from splitting across the two columns. */
  break-inside: avoid;
}

/* The first group's top margin would otherwise misalign the two column tops. */
.perm-group:first-child {
  margin-top: 0;
}

.perm-group__title {
  color: var(--text-color-soft);
  font-weight: bold;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.perm-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-x-small);
  margin: var(--space-xxx-small) 0;
  padding: var(--space-xxx-small) var(--space-xx-small);
  border-radius: var(--border-radius-small);
  /* Reserved, not added with the modifier: a marked row must not shift sideways. */
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.perm-row input:disabled {
  cursor: default;
}

/*
 * Pointed at from elsewhere on the page. Neutral on purpose — nothing is being added or taken
 * away, this row simply IS the sentence under the cursor. The outline rather than a background
 * so it still reads on a row that is already marked added or removed.
 */
.perm-row--touched {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

/* What the hovered role would add (green) or remove (red) against the one being edited. */
.perm-row--added {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  border-left-color: var(--color-success);
}

.perm-row--removed {
  background: color-mix(in srgb, var(--color-danger) 16%, transparent);
  border-left-color: var(--color-danger);
}

.perm-row--unavailable {
  opacity: 0.6;
  cursor: not-allowed;
}

.perm-row__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.perm-row__key {
  font-family: monospace;
  font-size: 0.85em;
}

.perm-row__desc {
  color: var(--text-color-soft);
  font-size: 0.8em;
}

.perm-row__note {
  color: var(--color-danger);
  font-size: 0.75em;
  font-style: italic;
}
</style>

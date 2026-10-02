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
      <span v-if="badgeFor(role)" class="role-tab__badge" :title="badgeTitle">★</span>
    </button>

    <!-- Whatever the page adds at the end of the row: an add button, an inline name input. -->
    <slot name="extra" />
  </div>
</template>

<script>
export default {
  name: 'RoleTabs',
  props: {
    roles: { type: Array, required: true },
    activeName: { type: String, default: null },
    /** How a role is named here — its label, a translation, or just its key. */
    labelFor: { type: Function, default: (role) => role.name },
    /** Which roles carry the ★: protected ones by default, system ones where that is meant. */
    badgeFor: { type: Function, default: (role) => Boolean(role.protected) },
    badgeTitle: { type: String, default: null },
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

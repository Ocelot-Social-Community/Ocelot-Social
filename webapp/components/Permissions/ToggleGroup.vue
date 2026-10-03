<template>
  <!--
    A row of buttons of which one is the current one: role tabs, template rows, the door. Four
    screens had a hand-made copy of this, each with its own active, hover and disabled rules, and
    each copy got one of them wrong in turn — a hover that lightened the filled button under its
    white text was the last. Built on OsButton, so how a button looks in each state is the
    library's business and the same as everywhere else in the app.

    Each button sits in a wrapper that carries its title: OsButton switches off pointer events
    while disabled, which would swallow the very tooltip that says WHY. The hover stays on the
    button — a disabled one has nothing to preview, since clicking it does nothing.
  -->
  <div class="toggle-group" role="radiogroup" :aria-label="label">
    <span
      v-for="item in items"
      :key="item.value"
      class="toggle-group__slot"
      :title="item.title || null"
    >
      <os-button
        :variant="item.value === value ? 'primary' : 'default'"
        :appearance="item.value === value ? 'filled' : 'outline'"
        size="sm"
        role="radio"
        :aria-checked="String(item.value === value)"
        class="toggle-group__item"
        :class="{
          'toggle-group__item--active': item.value === value,
          'toggle-group__item--marked': item.marked,
        }"
        :disabled="!!item.disabled"
        :data-test="item.testId"
        @click="$emit('select', item.value)"
        @mouseenter="$emit('hover', item.value)"
        @mouseleave="$emit('hover', null)"
      >
        {{ item.label }}
        <!-- Whatever a row adds to its buttons: a lock, an unsaved-changes dot. -->
        <slot name="extra" :item="item" />
      </os-button>
    </span>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  name: 'ToggleGroup',
  components: { OsButton },
  props: {
    /**
     * The buttons: `{ value, label, disabled?, title?, marked?, testId? }`. `title` says why a
     * button is disabled; `marked` that something elsewhere on the page points at it.
     */
    items: { type: Array, required: true },
    /** The current one. */
    value: { type: String, default: null },
    /** What the row as a whole chooses, for assistive tech. */
    label: { type: String, default: null },
  },
}
</script>

<style scoped>
.toggle-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xx-small);
}

.toggle-group__slot {
  display: inline-flex;
}

.toggle-group__item {
  gap: var(--space-xxx-small);
  outline-offset: 2px;
}

/* Pointed at from elsewhere on the page. An outline rather than a colour, so it reads the same
   on the filled button and on an outlined one. */
.toggle-group__item--marked {
  outline: 2px solid var(--color-primary);
}
</style>

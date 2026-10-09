<template>
  <!--
    A glyph, a name and what it means — the one way this app shows what kind of group something is
    or would be. The create form offers its templates as these, the rights screen states the
    group's visibility and door as these, so a choice made in one place is recognised in the
    other by its picture.

    A `div` where it states something, a `button` where it is picked; whatever the caller binds
    (type, disabled, title, data-test, click) lands on that element. The description is optional:
    a row of choices names them and explains the one in question underneath, rather than making
    every card as tall as its longest sentence.
  -->
  <component
    :is="tag"
    class="group-state-card"
    :class="{
      'group-state-card--interactive': tag === 'button',
      'group-state-card--active': active,
    }"
    v-bind="$attrs"
    :aria-pressed="tag === 'button' ? String(active) : null"
    v-on="$listeners"
  >
    <os-icon :icon="icon" size="2xl" class="group-state-card__icon" aria-hidden="true" />
    <span class="group-state-card__text">
      <span v-if="$slots.caption" class="group-state-card__caption"><slot name="caption" /></span>
      <strong class="group-state-card__title"><slot name="title" /></strong>
      <span v-if="$slots.default" class="group-state-card__description"><slot /></span>
    </span>
  </component>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'

export default {
  name: 'GroupStateCard',
  components: { OsIcon },
  inheritAttrs: false,
  props: {
    /** The glyph, from the icon registry. */
    icon: { type: [Function, Object, String], required: true },
    /** `div` to state, `button` to pick. */
    tag: { type: String, default: 'div' },
    /** The one picked, among several. */
    active: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.group-state-card {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  width: 100%;
  height: 100%;
  text-align: left;
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
  color: var(--text-color-base);
  padding: var(--space-small);
  font: inherit;
}

/* OsIcon sizes itself in `em` (2xl is 2.5em), so the font-size is the handle on how large the
   glyph comes out. It carries the state, so it is the largest thing on the card. */
.group-state-card__icon {
  flex: 0 0 auto;
  font-size: 1.4rem;
  color: var(--text-color-soft);
}

.group-state-card__text {
  display: flex;
  flex-direction: column;
}

.group-state-card__caption,
.group-state-card__description {
  color: var(--text-color-soft);
  font-size: 0.85em;
}

.group-state-card--interactive {
  cursor: pointer;
}

.group-state-card--interactive:hover:not(:disabled):not([aria-disabled='true']) {
  background: var(--background-color-softer);
}

.group-state-card--active {
  border-color: var(--color-primary);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

/* Not a filled card: the description under the name has to stay readable, and white on the
   brand green is exactly the contrast the filled buttons had to be fixed for. */
.group-state-card--active:hover:not(:disabled) {
  background: var(--background-color-base);
}

/* `aria-disabled` as well: a refusal that stays focusable, so it can still say why. */
.group-state-card:disabled,
.group-state-card[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

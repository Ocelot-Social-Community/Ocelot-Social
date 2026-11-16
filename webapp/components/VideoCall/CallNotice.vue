<template>
  <div :class="['call-notice', `call-notice--${tone}`]">
    <os-icon v-if="tone === 'warning'" :icon="icons.warning" class="call-notice__icon" />
    <span>
      {{ message }}
      <!--
        One action reads on as part of the sentence. Several are a choice: they get a line of
        their own, side by side, so that none of them ends up alone at the start of a line.
      -->
      <span
        v-if="actions.length"
        :class="['call-notice__actions', { 'call-notice__actions--own-line': actions.length > 1 }]"
      >
        <template v-for="(action, index) in actions">
          <span v-if="index > 0" :key="`${action.key}-separator`" aria-hidden="true">·</span>
          <button
            :key="action.key"
            type="button"
            class="call-notice__action"
            :data-test="action.dataTest"
            :disabled="!!action.disabled"
            @click="$emit('action', action.key)"
          >
            {{ action.label }}
          </button>
        </template>
      </span>
    </span>
  </div>
</template>

<script>
// One notice of the call, lying on its videos: a sentence, and what the user can do about it
// as links within it. A warning is something that stands in the user's way (no sound, a silent
// microphone); anything else only informs. How urgently it is announced is up to the live
// region it is placed in, which has to be there before the notice: one inserted along with
// its message is passed over by some screen readers.
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'CallNotice',
  components: { OsIcon },
  props: {
    message: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      default: 'info',
      validator: (value) => ['info', 'warning'].includes(value),
    },
    // [{ key, label, dataTest?, disabled? }] — a click emits `action` with the key.
    actions: {
      type: Array,
      default: () => [],
    },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style scoped>
.call-notice {
  padding: var(--space-xx-small) var(--space-small);
  border-radius: var(--border-radius-base);
  text-align: center;
  color: var(--video-on-media-color);
  background: var(--video-surface);
}

/*  A warning keeps the dark ground and light text of every notice: white on the warning */
/*  colour reads at 2.8:1 only, and a brand may darken that colour further. The colour marks */
/*  it instead, as a stripe and an icon — and the icon says it without the colour as well. */
.call-notice--warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-x-small);
  border-left: 4px solid var(--color-warning);
}

.call-notice__icon {
  flex: none;
  color: var(--color-warning);
}

/*  An action within the sentence: a button, as it acts rather than leads somewhere, */
/*  dressed as a link. The light primary keeps it readable on the dark ground. */
.call-notice__action {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--color-primary-light);
  text-decoration: underline;
  cursor: pointer;
}

.call-notice__actions--own-line {
  display: block;
}

/*  A label stays whole: "Lower quality" never breaks between its words. */
.call-notice__action {
  white-space: nowrap;
}

.call-notice__action:hover,
.call-notice__action:focus-visible {
  color: var(--text-color-link-active);
}

.call-notice__action:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.call-notice__action:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>

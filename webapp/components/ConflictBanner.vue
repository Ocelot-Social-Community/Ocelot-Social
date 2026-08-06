<template>
  <div class="conflict-banner" role="alert" :data-test="dataTest">
    <span class="conflict-banner__text">{{ message }}</span>
    <span class="conflict-banner__actions">
      <os-button
        variant="primary"
        appearance="filled"
        :data-test="`${dataTest}-load`"
        @click="$emit('load')"
      >
        {{ loadLabel }}
      </os-button>
      <os-button
        variant="primary"
        appearance="ghost"
        :data-test="`${dataTest}-keep`"
        @click="$emit('keep')"
      >
        {{ keepLabel }}
      </os-button>
    </span>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

// Concurrent-edit conflict banner, shared by the policy and roles admin tabs: a remote
// change landed under this admin's unsaved edit. Load = discard mine and take the server's;
// Keep = keep editing (my save will overwrite). Presentational only — the parent owns the
// conflict state, the translated copy, and what load/keep actually do.
export default {
  name: 'ConflictBanner',
  components: { OsButton },
  props: {
    // Translated banner text and button labels (the parent resolves i18n).
    message: { type: String, required: true },
    loadLabel: { type: String, required: true },
    keepLabel: { type: String, required: true },
    // Base data-test id: the root uses it verbatim, the buttons derive `${dataTest}-load`
    // / `${dataTest}-keep` — preserving each page's existing selectors after extraction.
    dataTest: { type: String, required: true },
  },
}
</script>

<style scoped>
/*  Margin is deliberately omitted — each parent sets its own outer spacing (via a class on */
/*  the component root) so the tabs keep their own vertical rhythm. */
.conflict-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-x-small);
  padding: var(--space-x-small) var(--space-small);
  border-radius: var(--border-radius-base);
  border-left: 3px solid var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 14%, transparent);
  font-size: 0.9em;
}

.conflict-banner__text {
  flex: 1 1 16rem;
}

.conflict-banner__actions {
  display: inline-flex;
  gap: var(--space-x-small);
}
</style>

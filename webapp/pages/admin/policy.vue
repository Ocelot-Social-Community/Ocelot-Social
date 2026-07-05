<template>
  <os-card>
    <h2 class="title">{{ $t('admin.policy.title') }}</h2>
    <p class="description">{{ $t('admin.policy.description') }}</p>
    <p v-if="lastChange" class="last-changed" data-test="policy-last-changed">
      {{
        $t('admin.policy.lastUpdated', {
          timestamp: formatTimestamp(lastChange.timestamp),
          actor: lastChange.actor,
        })
      }}
    </p>

    <!-- Concurrent-edit conflict: a setting changed on the server while this admin has
         unsaved edits. The draft is kept (their work is never silently lost); the diverged
         rows are highlighted with the incoming server value. Load = discard mine, take the
         server's; Keep = keep editing (my save will overwrite). -->
    <conflict-banner
      v-if="hasConflict"
      class="policy-conflict"
      :message="$t('admin.policy.conflict.message')"
      :load-label="$t('admin.policy.conflict.load')"
      :keep-label="$t('admin.policy.conflict.keep')"
      data-test="policy-conflict"
      @load="loadServerVersion"
      @keep="dismissConflict"
    />

    <form @submit.prevent="save" novalidate>
      <fieldset
        v-for="group in groups"
        :key="group.id"
        class="policy-group"
        :data-test="`policy-group-${group.id}`"
      >
        <legend class="policy-group__title">
          {{ $t(`admin.config.category.${group.id}`) }}
        </legend>

        <div
          v-for="key in group.keys"
          :key="key"
          :id="key"
          class="policy-row"
          :class="{
            'policy-row--conflict': conflict[key],
            'policy-row--unavailable': isUnavailable(key),
            'policy-row--highlight': highlightedKey === key,
          }"
        >
          <input
            v-if="isNumberKey(key)"
            :id="`policy-${key}`"
            type="number"
            min="0"
            step="1"
            class="policy-row__number"
            v-model.number="form[key]"
            :disabled="isUnavailable(key)"
            :data-test="`policy-${key}`"
          />
          <input
            v-else
            :id="`policy-${key}`"
            type="checkbox"
            class="policy-row__checkbox"
            v-model="form[key]"
            :disabled="isUnavailable(key)"
            :data-test="`policy-${key}`"
          />
          <label :for="`policy-${key}`" class="policy-row__label">
            <span class="policy-row__name">
              {{ $t(`admin.policy.keys.${key}`) }}
              <span
                v-if="defaults[key] !== undefined"
                class="policy-row__current"
                :data-test="`policy-default-${key}`"
              >
                {{ $t('admin.policy.defaultValue', { value: String(defaults[key]) }) }}
              </span>
              <span
                v-if="softwareDefaultOf(key) !== null"
                class="policy-row__software"
                :data-test="`policy-software-${key}`"
              >
                {{ $t('admin.policy.softwareDefault', { value: softwareDefaultOf(key) }) }}
              </span>
            </span>
            <span class="policy-row__description">
              {{ $t(`admin.policy.descriptions.${key}`) }}
            </span>
            <span
              v-if="isUnavailable(key)"
              class="policy-row__env"
              :data-test="`policy-env-${key}`"
            >
              {{ $t('admin.policy.envUnavailable') }}
              <nuxt-link :to="`/admin/config#${key}`" class="policy-row__env-link">
                {{ $t('admin.policy.envLink') }}
              </nuxt-link>
            </span>
            <span
              v-if="conflict[key]"
              class="policy-row__conflict"
              :data-test="`policy-conflict-${key}`"
            >
              {{ $t('admin.policy.conflict.serverValue', { value: String(snapshot[key]) }) }}
            </span>
          </label>
        </div>
      </fieldset>

      <div class="actions">
        <os-button
          type="submit"
          variant="primary"
          appearance="filled"
          :disabled="!isDirty || saving"
          data-test="policy-save"
        >
          {{ $t('admin.policy.save') }}
        </os-button>
        <os-button
          type="button"
          variant="primary"
          appearance="ghost"
          @click="resetAllToDefault"
          :disabled="saving"
          data-test="policy-reset"
        >
          {{ $t('admin.policy.reset') }}
        </os-button>
      </div>
    </form>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import { mapActions, mapGetters } from 'vuex'
import ConflictBanner from '~/components/ConflictBanner.vue'
import deepLinkHighlight from '~/mixins/deepLinkHighlight'
import { policyConfigQuery } from '~/graphql/admin/PolicyConfig'

// Display order of the policy groups. Groups are derived from each key's backend `category`
// (via policyConfig), so adding a key needs no hand-maintained list here — this only fixes
// the order. A category not listed is appended after these, so nothing silently vanishes.
const CATEGORY_ORDER = ['registration', 'features', 'layout', 'video']

export default {
  components: { ConflictBanner, OsButton, OsCard },
  // Deep-link highlight (highlightedKey, applyHashHighlight, hash watcher, fade timer) is
  // shared with the config tab. Rows are derived from policyConfig (async), so the highlight
  // is re-applied from the policyConfig watcher below once the rows exist.
  mixins: [deepLinkHighlight],
  middleware: ['isAdmin'],
  apollo: {
    // Per-key config layers + env availability. Drives the env-dependency UI: a key
    // whose hard env requirements are unmet is greyed/disabled here and links to the
    // config tab (where the missing env vars are listed).
    policyConfig: {
      query: policyConfigQuery,
      fetchPolicy: 'cache-and-network',
    },
  },
  data() {
    return {
      // Editable form values, keyed by policy key. Populated from the viewer-scoped snapshot
      // on mount (via $set — the key set is derived from the backend, not scaffolded here).
      form: {},
      // Snapshot value each form field was last synced from. Lets a live snapshot change
      // tell an untouched field (follow it live) from a locally-edited one (guard it, and
      // flag a conflict if the server moved it too).
      baseline: {},
      // Per-key concurrent-edit conflicts: a field this admin edited was ALSO changed on the
      // server. Cleared by resolving/dismissing the banner; re-raised by the next remote move.
      conflict: {},
      saving: false,
      // Becomes true after the initial mount fetch so the snapshot watcher only
      // reconciles (and refetches the last-change info) for *subsequent* (e.g. remote)
      // changes — the initial snapshot population is handled by the explicit mount sync.
      loaded: false,
      // Per-key config layers + availability from the backend (apollo above).
      policyConfig: [],
    }
  },
  computed: {
    ...mapGetters({
      snapshot: 'policy/snapshot',
      defaults: 'policy/defaults',
      lastChange: 'policy/lastChange',
    }),
    // All policy keys the viewer can see — read from the snapshot (present right after the
    // mount fetch), so the form logic never waits on the policyConfig query. The rendered
    // rows (groups) come from policyConfig; both cover the same key set.
    keys() {
      return Object.keys(this.snapshot)
    },
    // Rows grouped by each key's backend category (policyConfig), ordered by CATEGORY_ORDER.
    // No hand-maintained grouping/number-key/scaffold list — a new key shows up under its
    // schema category automatically. An unknown category is appended (never dropped).
    groups() {
      const byCategory = new Map()
      for (const entry of this.policyConfig) {
        const list = byCategory.get(entry.category) ?? []
        list.push(entry.key)
        byCategory.set(entry.category, list)
      }
      const ordered = [
        ...CATEGORY_ORDER.filter((category) => byCategory.has(category)),
        ...[...byCategory.keys()].filter((category) => !CATEGORY_ORDER.includes(category)),
      ]
      return ordered.map((category) => ({ id: category, keys: byCategory.get(category) }))
    },
    isDirty() {
      return this.keys.some((k) => this.form[k] !== this.snapshot[k])
    },
    // Any field this admin edited that the server also moved underneath.
    hasConflict() {
      return this.keys.some((k) => this.conflict[k])
    },
    // Per-key config entry keyed for O(1) template lookup (availability, layers).
    configByKey() {
      return Object.fromEntries(this.policyConfig.map((entry) => [entry.key, entry]))
    },
  },
  methods: {
    ...mapActions({
      fetchPolicy: 'policy/init',
      fetchDefaults: 'policy/fetchDefaults',
      setKey: 'policy/setKey',
      resetKey: 'policy/resetKey',
    }),
    formatTimestamp(timestamp) {
      const date = new Date(timestamp)
      return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString()
    },
    // Integer policies render as a number input (booleans as a checkbox). The type comes
    // from the backend (policyConfig), so there is no separate number-key list to maintain.
    isNumberKey(key) {
      return this.configByKey[key]?.type === 'integer'
    },
    // The hash keys this tab can highlight (deepLinkHighlight mixin): every policy key,
    // whose row element id is the key itself.
    highlightableKeys() {
      return this.keys
    },
    // A key is unavailable when its hard env requirements are unmet: the stored flag
    // has no effect, so the input is disabled and a link to the config tab is shown.
    isUnavailable(key) {
      return this.configByKey[key]?.available === false
    },
    // The code baseline (third value layer), formatted for display, or null if unknown.
    softwareDefaultOf(key) {
      const entry = this.configByKey[key]
      if (!entry) return null
      try {
        return String(JSON.parse(entry.softwareDefault))
      } catch {
        return entry.softwareDefault
      }
    },
    // Hard sync: adopt the whole server snapshot, reset the baseline to it, and clear all
    // conflicts. Used on mount, reset-to-default, and "load new version" (discard my edits).
    syncFormFromSnapshot() {
      const baseline = {}
      this.keys.forEach((k) => {
        // $set: the form starts empty and its keys come from the backend, so a plain
        // assignment on a new key would not be reactive in Vue 2.
        this.$set(this.form, k, this.snapshot[k])
        baseline[k] = this.snapshot[k]
      })
      this.baseline = baseline
      this.conflict = {}
    },
    // Soft sync on a live snapshot change: per key, an untouched field follows the server
    // (reactive), while a field this admin edited is guarded — and, if the server moved it
    // too, marked as a conflict (keep my value, surface it) instead of being clobbered.
    reconcileWithSnapshot() {
      const conflict = { ...this.conflict }
      this.keys.forEach((k) => {
        const locallyEdited = this.form[k] !== this.baseline[k]
        const serverMoved = this.snapshot[k] !== this.baseline[k]
        if (!locallyEdited) {
          // untouched → follow the server live.
          this.form[k] = this.snapshot[k]
          this.baseline[k] = this.snapshot[k]
          conflict[k] = false
        } else if (serverMoved && this.form[k] !== this.snapshot[k]) {
          // edited here AND the server moved it to a DIFFERENT value → real conflict.
          conflict[k] = true
        } else if (serverMoved) {
          // edited here but the server moved to the SAME value we chose (for a boolean the
          // only possible move) → no real contradiction; adopt it as the baseline so the
          // field settles (not dirty, no banner) rather than flagging a phantom conflict.
          this.baseline[k] = this.snapshot[k]
          conflict[k] = false
        } else {
          // edited here, server still at (or reverted back to) our baseline → just an
          // ordinary unsaved edit, not a conflict. Clear any stale banner, e.g. after a
          // remote change was undone (server bounced away from and back to the baseline).
          conflict[k] = false
        }
      })
      this.conflict = conflict
    },
    // Resolve a conflict by discarding local edits and adopting the server snapshot.
    loadServerVersion() {
      this.syncFormFromSnapshot()
    },
    // Keep editing (keep mine): hide the banner but preserve the draft values. Advance the
    // baseline of the conflicted keys to the acknowledged server value so a later unrelated
    // reconcile does not re-pop the banner; only a genuinely NEW move on a key raises it
    // again. The eventual save overwrites the server value.
    dismissConflict() {
      this.keys.forEach((k) => {
        if (this.conflict[k]) this.baseline[k] = this.snapshot[k]
      })
      this.conflict = {}
    },
    async save() {
      this.saving = true
      try {
        const changes = this.keys
          .filter((k) => this.form[k] !== this.snapshot[k])
          .map((key) => ({ key, value: this.form[key] }))
        for (const { key, value } of changes) {
          // Advance THIS key's baseline right before its write, so the server echo of a
          // SUCCESSFUL write — which can arrive while setKey is still pending — reconciles
          // cleanly instead of looking like a remote conflict.
          const previousBaseline = this.baseline[key]
          this.baseline[key] = value
          try {
            await this.setKey({ key, value })
          } catch (err) {
            // The write did not persist: roll this key's baseline back, else a later snapshot
            // update would mistake the unsaved local value for the baseline and silently
            // overwrite the input. Already-persisted keys keep their advanced baseline.
            this.baseline[key] = previousBaseline
            throw err
          }
          // Persisted → this key is the server's value now, so it is no longer in conflict.
          this.$set(this.conflict, key, false)
        }
        this.$toast.success(this.$t('admin.policy.saveSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.policy.saveError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
    async resetAllToDefault() {
      this.saving = true
      try {
        for (const key of this.keys) {
          await this.resetKey({ key })
        }
        this.syncFormFromSnapshot()
        this.$toast.success(this.$t('admin.policy.saveSuccess'))
      } catch (err) {
        this.$toast.error(this.$t('admin.policy.saveError', { message: err.message }))
      } finally {
        this.saving = false
      }
    },
  },
  watch: {
    snapshot: {
      handler() {
        // The initial snapshot population (during mount) is handled by the explicit
        // syncFormFromSnapshot() in mounted(); ignore it here so an unset baseline is not
        // mistaken for a pile of local edits.
        if (!this.loaded) return
        // A snapshot change after load means someone (possibly a remote admin, via the
        // subscription) changed a policy. Reconcile per key: untouched fields follow it
        // live, edited fields are guarded and flagged as conflicts if the server moved them.
        this.reconcileWithSnapshot()
        // The broadcast carries no actor/timestamp (Datensparsamkeit), so refetch the admin
        // bundle to keep the "last changed by … at …" line correct. Cheap and page-scoped:
        // only runs while this admin page is open. Fault-tolerant: a failed refresh just
        // leaves the last-changed line stale, never throws.
        this.fetchDefaults().catch(() => undefined)
      },
      deep: true,
    },
    // Rows are derived from policyConfig (async) → (re)apply the deep-link highlight once
    // they're populated, so a deep link that arrived before the rows still scrolls/highlights.
    policyConfig() {
      this.applyHashHighlight()
    },
  },
  async mounted() {
    // Required: the viewer-scoped snapshot drives the form/checkboxes. policy/init
    // swallows its own errors, so this won't reject — the page is usable from it.
    await this.fetchPolicy()
    // Optional admin metadata (configured defaults + last-changed line). A failure
    // here must NOT break the page: degrade gracefully (grey defaults / last-changed
    // line simply won't render) rather than aborting the whole init.
    try {
      await this.fetchDefaults()
    } catch (err) {
      // ignore — snapshot alone is enough to work with
    }
    this.syncFormFromSnapshot()
    this.loaded = true
  },
}
</script>

<style lang="scss" scoped>
.title {
  margin-bottom: $space-xx-small;
}
.description {
  margin-bottom: 0;
  color: $text-color-soft;
}
.last-changed {
  margin: $space-xxx-small 0 0;
  color: $text-color-soft;
  font-size: 0.85em;
  font-style: italic;
}
// Consistent gap before the first heading, whether or not the "last changed"
// line is present.
form {
  margin-top: $space-base;
}
.policy-group {
  border: none;
  padding: 0;
  margin: 0 0 $space-small 0;

  // Set the heading off with an underline only as wide as the text itself.
  &__title {
    padding: 0 0 $space-xxx-small 0;
    margin-bottom: $space-xx-small;
    border-bottom: 1px solid $border-color-softer;
    color: $text-color-soft;
    font-weight: bold;
    font-size: 0.9em;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
}
// Outer spacing for the shared conflict banner (its appearance lives in ConflictBanner.vue).
.policy-conflict {
  margin-top: $space-small;
}
.policy-row {
  display: flex;
  align-items: flex-start;
  gap: $space-x-small;
  margin: $space-xx-small 0;
  line-height: 1.3;
  border-left: 3px solid transparent;
  padding-left: $space-xx-small;
  // Keep the row clear of the sticky header when navigated to via #key from the config tab.
  scroll-margin-top: $space-base;
  // Animate the deep-link highlight fading back out (applyHashHighlight clears the key
  // after a moment). Only when the user hasn't asked for reduced motion.
  @media (prefers-reduced-motion: no-preference) {
    transition:
      background-color 0.6s ease,
      border-left-color 0.6s ease;
  }

  // Navigated to from the config tab (/admin/policy#<key>) → highlight the target row so
  // the admin sees which policy the config link pointed at. The class is driven from the
  // route hash (see applyHashHighlight) because history-mode pushState navigations don't
  // update :target; the :target rule stays as a fallback for a real full-page load/reload.
  &--highlight,
  &:target {
    border-left-color: $color-secondary;
    background: rgba($color-secondary, 0.1);
  }

  // This field was edited locally AND changed on the server → highlight it.
  &--conflict {
    border-left-color: $color-warning;
    background: rgba($color-warning, 0.1);
  }

  &__checkbox {
    margin-top: 0.15em;
    flex-shrink: 0;
  }
  &__number {
    width: 4.5em;
    margin-top: -0.1em;
    flex-shrink: 0;
  }
  &__label {
    display: flex;
    flex-direction: column;
    cursor: pointer;
  }
  &__name {
    font-weight: 600;
  }
  &__current {
    margin-left: $space-xx-small;
    color: $text-color-soft;
    font-family: monospace;
    font-size: 0.8em;
    font-weight: normal;
  }
  &__software {
    margin-left: $space-xx-small;
    color: $text-color-soft;
    font-family: monospace;
    font-size: 0.75em;
    font-weight: normal;
    opacity: 0.75;
  }
  &__description {
    color: $text-color-soft;
    font-size: 0.85em;
    line-height: 1.25;
  }
  &__conflict {
    margin-top: 0.15em;
    color: $color-warning-active;
    font-size: 0.8em;
    font-weight: 600;
  }
  &__env {
    color: $color-danger;
    font-size: 0.85em;
    line-height: 1.25;
  }
  &__env-link {
    white-space: nowrap;
  }

  // Hard env requirement unmet: the stored flag has no effect, so dim the row and
  // disable its input (the env note + config link explain why).
  &--unavailable {
    opacity: 0.6;
  }
}
.actions {
  margin-top: $space-small;
  display: flex;
  gap: $space-small;
}
</style>

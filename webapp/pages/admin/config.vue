<template>
  <os-card>
    <h2 class="title">{{ $t('admin.config.title') }}</h2>
    <p class="description">{{ $t('admin.config.description') }}</p>

    <!-- One row per environment variable the deployment recognises, grouped by area.
         Read-only diagnostic mirror: it shows what the ENV provides, while the live
         effective values of policy-backed vars are edited on the policy tab. Columns
         run most-important → least: effective state, whether a policy overrides it,
         the env value, and the software default it falls back to. Secrets (and hard
         env requirements) report presence only via a badge — their value columns are
         em-dashed, a secret value is never sent to the client. -->
    <div class="config-table-wrap">
      <table class="config-table" data-test="config-table">
        <caption class="config-caption">{{ $t('admin.config.tableCaption') }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ $t('admin.config.col.envKey') }}</th>
            <th scope="col">{{ $t('admin.config.col.effective') }}</th>
            <th scope="col">{{ $t('admin.config.col.override') }}</th>
            <th scope="col">{{ $t('admin.config.col.envValue') }}</th>
            <th scope="col" class="col--muted">{{ $t('admin.config.col.softwareDefault') }}</th>
          </tr>
        </thead>
        <tbody
          v-for="group in groups"
          :key="group.category"
          :data-test="`config-group-${group.category}`"
        >
          <!-- Category sub-heading spanning the row group. -->
          <tr class="config-group-head">
            <th scope="colgroup" colspan="5">
              {{ $t(`admin.config.category.${group.category}`) }}
            </th>
          </tr>

          <tr
            v-for="row in group.rows"
            :id="row.anchor"
            :key="row.envKey"
            class="config-row"
            :class="{
              'config-row--blocking': row.blocking,
              'config-row--highlight': row.anchor && row.anchor === highlightedKey,
            }"
            :data-test="`config-row-${row.envKey}`"
          >
            <!-- 1. Env variable — the actionable identity of the row. -->
            <th scope="row" class="cell cell--key">
              <code>{{ row.envKey }}</code>
            </th>

            <!-- 2. Effective state in operation. A value-bearing var shows its effective
                 value; a secret or a hard-requirement var shows presence only (badge). -->
            <td class="cell cell--effective">
              <span v-if="row.effective !== null" class="value">{{ fmt(row.effective) }}</span>
              <template v-else>
                <span
                  class="badge"
                  :class="row.state === 'set' ? 'badge--ok' : 'badge--error'"
                  :data-test="`config-state-${row.envKey}`"
                >
                  {{ $t(`admin.config.state.${row.state}`) }}
                </span>
              </template>
              <span v-if="row.blocking" class="cell__blocks">
                {{ $t('admin.config.blocks', { policy: policyLabel(row.policyKey) }) }}
              </span>
            </td>

            <!-- 3. Policy override: when the value is governed by an editable policy, this
                 links to that policy on the policy tab (which highlights it via :target).
                 Shows the override value if one diverges from the configured default, else
                 a "set override" affordance. Env vars without a policy get a plain dash. -->
            <td class="cell">
              <nuxt-link
                v-if="row.overridable"
                :to="`/admin/policy#${row.policyKey}`"
                class="override-link"
                :class="{ 'override-link--empty': row.override === null }"
                :data-test="`config-override-${row.envKey}`"
                :aria-label="$t('admin.config.editPolicy', { policy: policyLabel(row.policyKey) })"
              >
                <span v-if="row.override !== null" class="value">{{ fmt(row.override) }}</span>
                <span v-else>{{ $t('admin.config.setOverride') }}</span>
              </nuxt-link>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.notSet') }}</span>
              </span>
            </td>

            <!-- 4. Env value: the value the env var itself provides when set, else nothing
                 (secrets and unset vars are em-dashed). -->
            <td class="cell">
              <code v-if="row.envValue !== null" :data-test="`config-envvalue-${row.envKey}`">
                {{ fmt(row.envValue) }}
              </code>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.notSet') }}</span>
              </span>
            </td>

            <!-- 5. Software default: the code baseline the value falls back to. Secrets
                 and hard-requirement vars have none. -->
            <td class="cell cell--muted">
              <code v-if="row.softwareDefault !== null">{{ fmt(row.softwareDefault) }}</code>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.notSet') }}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { systemConfigQuery } from '~/graphql/admin/SystemConfig'

// Fixed display order of the category groups (infrastructure first, then feature
// policies, then diagnostics). A category with no rows is skipped in `groups`.
const CATEGORY_ORDER = [
  'server',
  'database',
  'redis',
  'storage',
  'mail',
  'auth',
  'maps',
  'video',
  'registration',
  'features',
  'monitoring',
  'general',
]

export default {
  components: { OsCard },
  middleware: ['isAdmin'],
  data() {
    return {
      systemConfig: [],
      // The policy key deep-linked to from the policy/roles tabs (/admin/config#<key>),
      // used to highlight and scroll to its row. Driven from the route hash rather than
      // the CSS :target pseudo-class: the app runs vue-router in history mode, so an
      // in-app navigation is a history.pushState that browsers don't re-evaluate :target
      // for. Rows arrive asynchronously (apollo), so the highlight is (re)applied when the
      // data or the hash changes.
      highlightedKey: null,
    }
  },
  apollo: {
    systemConfig: {
      query: systemConfigQuery,
      // Re-resolve against the CURRENT deployment state every time the tab is opened
      // (admin tabs are separate routes) — a stale cache could hide a just-fixed secret.
      fetchPolicy: 'cache-and-network',
    },
  },
  computed: {
    // The env vars grouped by category in CATEGORY_ORDER, empty groups dropped. The
    // FIRST row of each policy carries the policy key as its element id, so the policy
    // tab's "see config" link (/admin/config#<key>) lands here without duplicate ids.
    groups() {
      const anchored = new Set()
      const byCategory = new Map()
      for (const entry of this.systemConfig) {
        let anchor
        if (entry.policyKey && !anchored.has(entry.policyKey)) {
          anchored.add(entry.policyKey)
          anchor = entry.policyKey
        }
        const rows = byCategory.get(entry.category) ?? []
        rows.push({ ...entry, anchor })
        byCategory.set(entry.category, rows)
      }
      return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
        category,
        rows: byCategory.get(category),
      }))
    },
  },
  methods: {
    // Reuse the policy tab's human labels for policy keys (used in the "blocks …" hint
    // and the override link's accessible name).
    policyLabel(key) {
      return this.$t(`admin.policy.keys.${key}`)
    },
    // Pretty-print a value for display: JSON-encoded policy values parse to their
    // primitive; a raw env string passes through unchanged.
    fmt(value) {
      try {
        return String(JSON.parse(value))
      } catch {
        return value
      }
    },
    // Highlight and scroll to the row deep-linked from the policy/roles tabs
    // (/admin/config#<policyKey>). The hash targets a policy's anchored (first) row; a
    // bare "#" or a key with no matching row clears the highlight. No-ops until the row
    // exists (apollo may still be loading), re-run by the watchers below.
    applyHashHighlight() {
      const key = (this.$route?.hash || '').replace(/^#/, '')
      const known = key && this.systemConfig.some((entry) => entry.policyKey === key)
      this.highlightedKey = known ? key : null
      if (!this.highlightedKey) return
      this.$nextTick(() => {
        document.getElementById(this.highlightedKey)?.scrollIntoView({ block: 'center' })
      })
    },
  },
  watch: {
    // Rows arrive asynchronously (apollo) → highlight once they're populated; and again
    // if the deep-link hash changes while already on this tab.
    systemConfig() {
      this.applyHashHighlight()
    },
    '$route.hash'() {
      this.applyHashHighlight()
    },
  },
  mounted() {
    // Covers the case where the query result is already cached (rows present at mount).
    this.applyHashHighlight()
  },
}
</script>

<style lang="scss" scoped>
.title {
  margin-bottom: $space-xx-small;
}
.description {
  margin: 0 0 $space-base;
  color: $text-color-soft;
}
// Screen-reader-only text: the table caption and the accessible name of an em-dashed
// ("not set") cell, so assistive tech never reads a bare dash.
.config-caption {
  @include visually-hidden;
}
// Let the wide table scroll horizontally on narrow admin viewports instead of wrapping
// its monospace values into an unreadable mess.
.config-table-wrap {
  overflow-x: auto;
}
.config-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;

  th,
  td {
    padding: $space-xx-small $space-x-small;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid $border-color-softer;
  }
  thead th {
    color: $text-color-soft;
    font-size: 0.8em;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 2px solid $border-color-softer;
    white-space: nowrap;
  }
  .col--muted {
    color: $text-color-soft;
  }
}
// Category sub-heading spanning the whole width, introducing each row group.
.config-group-head th {
  padding-top: $space-base;
  color: $text-color-base;
  font-size: 0.85em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid $border-color-soft;
}
.config-row {
  // Reserve the accent gutter on every row so the layout doesn't shift when a row
  // becomes blocking; only a blocking row colours it.
  th.cell--key {
    border-left: 3px solid transparent;
  }
  // Keep the row clear of the sticky admin header when scrolled to via #key.
  scroll-margin-top: $space-base;

  // A missing hard-requirement secret breaks its feature → flag the whole row.
  &--blocking {
    background: rgba($color-danger, 0.07);

    th.cell--key {
      border-left-color: $color-danger;
    }
  }

  // Deep-linked to from the policy/roles tabs (/admin/config#<key>) → highlight the
  // anchored row so the admin sees which env var the link pointed at. Placed after
  // --blocking so a highlighted row reads as the navigation target.
  &--highlight {
    background: rgba($color-primary, 0.1);

    th.cell--key {
      border-left-color: $color-primary;
    }
  }
}
.cell {
  &--key code {
    font-weight: 600;
  }
  &--effective .value {
    font-weight: 600;
  }
  &--muted {
    color: $text-color-soft;
  }
  &__blocks {
    display: block;
    margin-top: $space-xxx-small;
    color: $color-danger;
    font-size: 0.85em;
  }
}
.cell-empty {
  color: $text-color-soft;
}
// Link from an overridable value to its policy on the policy tab.
.override-link {
  .value {
    font-weight: 600;
  }
  // No override set yet: muted, but still a clear affordance to go set one.
  &--empty {
    color: $text-color-soft;
    font-size: 0.85em;
    font-style: italic;
  }
}
.badge {
  display: inline-block;
  padding: 0.1em 0.5em;
  border-radius: $border-radius-base;
  font-size: 0.8em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  &--ok {
    background-color: $color-success;
    color: $color-success-inverse;
  }
  &--error {
    background-color: $color-danger;
    color: $color-danger-inverse;
  }
}
</style>

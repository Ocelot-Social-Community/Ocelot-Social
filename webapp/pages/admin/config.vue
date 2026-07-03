<template>
  <os-card>
    <h2 class="title">{{ $t('admin.config.title') }}</h2>
    <p class="description">{{ $t('admin.config.description') }}</p>

    <!-- One row per environment variable the deployment recognises, grouped by area.
         Read-only diagnostic mirror: it shows what the ENV provides, while the live
         effective values of policy-backed vars are edited on the policy tab. Columns
         run most-important → least: effective state, whether a policy overrides it,
         the env value, and the software default it falls back to. Secrets (and hard
         env requirements) report presence only via a badge; a set secret shows its env
         value masked (present, but the value is never sent to the client). -->
    <div class="config-table-wrap">
      <table class="config-table" data-test="config-table">
        <caption class="config-caption">{{ $t('admin.config.tableCaption') }}</caption>
        <colgroup>
          <col class="col--key" />
          <col class="col--effective" />
          <col class="col--override" />
          <col class="col--envvalue" />
          <col class="col--default" />
        </colgroup>
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
            <!-- 1. Env variable — the actionable identity of the row. Never truncated
                 (it's the primary identifier); wraps on very narrow viewports instead. -->
            <th scope="row" class="cell cell--key">
              <code>{{ row.envKey }}</code>
            </th>

            <!-- 2. Effective state in operation. A value-bearing var shows its effective
                 value; a secret or a hard-requirement var shows presence only (badge). -->
            <td class="cell cell--effective">
              <span
                v-if="row.effective !== null"
                class="value truncate"
                :title="truncTitle(row.effectiveText)"
                :tabindex="truncTab(row.effectiveText)"
              >
                {{ row.effectiveText }}
              </span>
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

            <!-- 4. Env value: the value the env var itself provides. A set secret is shown
                 masked (present, but its value is never revealed), a plain var shows its
                 value, and an unset var is em-dashed. -->
            <td class="cell">
              <span
                v-if="row.secret && row.state === 'set'"
                class="value value--masked"
                :data-test="`config-envvalue-${row.envKey}`"
              >
                <span aria-hidden="true">••••••</span>
                <span class="config-caption">{{ $t('admin.config.secretHidden') }}</span>
              </span>
              <code
                v-else-if="row.envValue !== null"
                class="truncate"
                :data-test="`config-envvalue-${row.envKey}`"
                :title="truncTitle(row.envValueText)"
                :tabindex="truncTab(row.envValueText)"
              >
                {{ row.envValueText }}
              </code>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.notSet') }}</span>
              </span>
            </td>

            <!-- 5. Software default: the code baseline the value falls back to. Secrets
                 and hard-requirement vars have none — em-dashed as "no default" (not as
                 "not set", which would wrongly read as an unset env var). -->
            <td class="cell cell--muted">
              <code
                v-if="row.softwareDefault !== null"
                class="truncate"
                :title="truncTitle(row.softwareDefaultText)"
                :tabindex="truncTab(row.softwareDefaultText)"
              >
                {{ row.softwareDefaultText }}
              </code>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.noDefault') }}</span>
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

// How long a deep-link highlight stays before it fades out (see applyHashHighlight).
const HIGHLIGHT_DURATION_MS = 2500

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
        rows.push({
          ...entry,
          anchor,
          // Pre-format the value strings once (used for the cell text, the title tooltip
          // and the truncation decision) instead of calling fmt() repeatedly in template.
          effectiveText: entry.effective === null ? null : this.fmt(entry.effective),
          envValueText: entry.envValue === null ? null : this.fmt(entry.envValue),
          softwareDefaultText:
            entry.softwareDefault === null ? null : this.fmt(entry.softwareDefault),
        })
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
    // A value long enough to be worth truncating (shown ellipsised, full value on
    // hover/tap). Short values render as plain, non-interactive text.
    needsTrunc(text) {
      return typeof text === 'string' && text.length > 24
    },
    // title tooltip / tabindex only for truncated values, so short cells stay
    // non-interactive and don't clutter the keyboard tab order.
    truncTitle(text) {
      return this.needsTrunc(text) ? text : null
    },
    truncTab(text) {
      return this.needsTrunc(text) ? 0 : null
    },
    // Highlight and scroll to the row deep-linked from the policy/roles tabs
    // (/admin/config#<policyKey>). The hash targets a policy's anchored (first) row; a
    // bare "#" or a key with no matching row clears the highlight. No-ops until the row
    // exists (apollo may still be loading), re-run by the watchers below.
    applyHashHighlight() {
      clearTimeout(this.highlightTimer)
      const key = (this.$route?.hash || '').replace(/^#/, '')
      const known = key && this.systemConfig.some((entry) => entry.policyKey === key)
      this.highlightedKey = known ? key : null
      if (!this.highlightedKey) return
      this.$nextTick(() => {
        document.getElementById(this.highlightedKey)?.scrollIntoView({ block: 'center' })
      })
      // Fade the highlight out after a moment: it draws the eye on arrival without
      // sticking permanently. Clearing the key drops the class; the CSS transition
      // animates the fade.
      this.highlightTimer = setTimeout(() => {
        this.highlightedKey = null
      }, HIGHLIGHT_DURATION_MS)
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
  beforeDestroy() {
    clearTimeout(this.highlightTimer)
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
// No horizontal scroll box (it would break the viewport-sticky header). Instead the
// table is fixed-layout at width:100%, so it is ALWAYS exactly as wide as the card —
// never wider (no desktop overflow past the card, no mobile page-fill). Long values are
// clipped to their column (see .truncate), keys/headers wrap.
.config-table-wrap {
  overflow: visible;
}
.config-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.9em;

  // Column widths (sum 100%): the key gets the most room, the override the least.
  .col--key {
    width: 24%;
  }
  .col--effective {
    width: 20%;
  }
  .col--override {
    width: 12%;
  }
  .col--envvalue {
    width: 22%;
  }
  .col--default {
    width: 22%;
  }

  th,
  td {
    padding: $space-xx-small $space-x-small;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid $border-color-softer;
    // Keys and headers wrap within their fixed column instead of overflowing it; value
    // cells opt out via .truncate (single line + ellipsis).
    overflow-wrap: anywhere;
  }
  thead th {
    color: $text-color-soft;
    font-size: 0.8em;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 2px solid $border-color-softer;
    // Freeze the column header just below the fixed app header (its height is exposed as
    // --header-height) so it stays visible while the page scrolls. border-collapse drops
    // a sticky cell's own border during scroll → keep the divider as an inset shadow, and
    // give the cell an opaque background so scrolled rows don't show through.
    position: sticky;
    top: var(--header-height, 6rem);
    z-index: $z-index-sticky;
    background: $background-color-base;
    box-shadow: inset 0 -2px 0 $border-color-softer;
  }
  .col--muted {
    color: $text-color-soft;
  }
}
// Category sub-heading spanning the whole width, introducing each row group. The
// leading gap separates one group from the previous one, so the very first group
// (directly under the table head) drops it.
.config-group-head th {
  padding-top: $space-base;
  color: $text-color-base;
  font-size: 0.85em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid $border-color-soft;
}
.config-table tbody:first-of-type .config-group-head th {
  padding-top: calc($space-base / 2);
}
.config-row {
  // Reserve the accent gutter on every row so the layout doesn't shift when a row
  // becomes blocking; only a blocking row colours it.
  th.cell--key {
    border-left: 3px solid transparent;
  }
  // Keep the row clear of the sticky admin header when scrolled to via #key.
  scroll-margin-top: $space-base;
  // Animate the deep-link highlight fading back out (applyHashHighlight clears the key
  // after a moment). Only when the user hasn't asked for reduced motion.
  @media (prefers-reduced-motion: no-preference) {
    transition: background-color 0.6s ease;

    th.cell--key {
      transition: border-left-color 0.6s ease;
    }
  }

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
    background: rgba($color-secondary, 0.1);

    th.cell--key {
      border-left-color: $color-secondary;
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
// Values are clipped to their fixed column on a single line (no wrapping, no widening
// the table). The full value is revealed on hover via the native title tooltip, and on
// tap / keyboard focus, which expands it in place (mobile has no hover). Only actually
// truncated values are focusable (see truncTab), so short cells stay inert.
.truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.truncate[tabindex] {
  cursor: pointer;
}
.truncate:focus {
  overflow: visible;
  white-space: normal;
  overflow-wrap: anywhere;
  outline: 2px solid $color-secondary;
  outline-offset: 1px;
}
// A set secret: shown as masked dots (present, value withheld) rather than a value or
// a misleading "not set" dash.
.value--masked {
  color: $text-color-soft;
  letter-spacing: 0.15em;
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

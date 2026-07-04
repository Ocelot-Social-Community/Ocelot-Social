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
              <span v-if="row.effective !== null" class="value truncate">
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
              <code v-if="row.softwareDefault !== null" class="truncate">
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
import deepLinkHighlight from '~/mixins/deepLinkHighlight'
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
  // Deep-link highlight (highlightedKey, applyHashHighlight, hash watcher, fade timer) is
  // shared with the policy tab. Rows arrive asynchronously (apollo), so the highlight is
  // re-applied from the systemConfig watcher below once the data is populated.
  mixins: [deepLinkHighlight],
  middleware: ['isAdmin'],
  data() {
    return {
      systemConfig: [],
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
          // Pre-format the value strings once instead of calling fmt() repeatedly in the
          // template.
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
    // Whether a value is ACTUALLY clipped depends on the (fixed) column width, not a
    // character count — so it is measured from the DOM. A clipped value marks its CELL
    // (not the clipped text, whose overflow:hidden would crop the tooltip) as interactive:
    // .is-clipped (positioning + cursor), focusable for touch/keyboard, and data-full
    // carrying the value the CSS tooltip renders. Runs after render and on resize.
    refreshTruncation() {
      const nodes = this.$el?.querySelectorAll?.('.truncate')
      if (!nodes) return
      nodes.forEach((el) => {
        const cell = el.parentElement
        if (!cell) return
        const clipped = el.scrollWidth > el.clientWidth
        cell.classList.toggle('is-clipped', clipped)
        if (clipped) {
          cell.setAttribute('tabindex', '0')
          cell.setAttribute('data-full', (el.textContent || '').trim())
        } else {
          cell.removeAttribute('tabindex')
          cell.removeAttribute('data-full')
        }
      })
    },
    onResize() {
      // Coalesce bursts of resize events into one measurement per frame.
      if (this.resizeFrame) return
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = null
        this.refreshTruncation()
      })
    },
    // The hash keys this tab can highlight (deepLinkHighlight mixin): every policy key
    // present. The deep link from the policy/roles tabs targets a policy's anchored first
    // row, whose element id is the policy key.
    highlightableKeys() {
      return this.systemConfig.map((entry) => entry.policyKey).filter(Boolean)
    },
  },
  watch: {
    // Rows arrive asynchronously (apollo) → (re)apply the deep-link highlight once they're
    // populated. The hash-change case is handled by the mixin's own watcher.
    systemConfig() {
      this.applyHashHighlight()
    },
  },
  mounted() {
    this.$nextTick(this.refreshTruncation)
    window.addEventListener('resize', this.onResize)
  },
  updated() {
    // Rows/values changed → re-measure which cells are clipped.
    this.$nextTick(this.refreshTruncation)
  },
  beforeDestroy() {
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame)
    window.removeEventListener('resize', this.onResize)
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

  // Mobile-first: show only the three most important columns (key / effective state /
  // policy override). The env value and software default are hidden so the narrow table
  // stays readable; the desktop media query below re-adds them.
  .col--key {
    width: 46%;
  }
  .col--effective {
    width: 32%;
  }
  .col--override {
    width: 22%;
  }
  th:nth-child(4),
  td:nth-child(4),
  th:nth-child(5),
  td:nth-child(5) {
    display: none;
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
    // Dark (not soft-grey) so the bold weight actually reads as bold — matching the key
    // column / category sub-headings. The app font (Lato) only ships 400/700, so a grey
    // 700 header otherwise looks lighter than the dark key names. Same font size as the
    // body cells (no shrinking) — it inherits the table's 0.9em.
    color: $text-color-base;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    // Freeze the column header just below the fixed app header (its height is exposed as
    // --header-height) so it stays visible while the page scrolls. A SINGLE divider via an
    // inset shadow (no border-bottom, which would double it at rest and is anyway dropped
    // by border-collapse while scrolling); opaque background so scrolled rows don't show through.
    border-bottom: none;
    position: sticky;
    top: var(--header-height, 6rem);
    z-index: $z-index-sticky;
    background: $background-color-base;
    box-shadow: inset 0 -2px 0 $border-color-softer;
  }
}

// Desktop: room for all five columns (env value + software default are re-added).
@media #{$media-query-medium} {
  .config-table {
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
    th:nth-child(4),
    td:nth-child(4),
    th:nth-child(5),
    td:nth-child(5) {
      display: table-cell;
    }
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
// the table). refreshTruncation() flags the CELLS whose value is actually clipped.
.truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
// A clipped cell reveals the full value as an overlay tooltip on hover / tap / keyboard
// focus — an ::after on the cell (whose overflow is visible, unlike the clipped .truncate)
// so it floats above the table WITHOUT growing the row (no layout shift). The value comes
// from data-full; the cell is the positioning context.
.cell.is-clipped {
  position: relative;
  cursor: help;
}
.cell.is-clipped:hover,
.cell.is-clipped:focus {
  // Lift above sibling cells so the tooltip is never covered by later rows.
  z-index: 10;
}
.cell.is-clipped:focus {
  outline: 2px solid $color-secondary;
  outline-offset: -2px;
}
.cell.is-clipped:hover::after,
.cell.is-clipped:focus::after {
  content: attr(data-full);
  position: absolute;
  top: calc(100% - #{$space-xxx-small});
  // Anchored to the cell's right edge and extending left — there is always room to the
  // left (earlier columns), so the tooltip stays on screen.
  right: $space-x-small;
  z-index: 20;
  width: max-content;
  max-width: min(50ch, calc(100vw - 1rem));
  padding: $space-xx-small $space-x-small;
  background: $background-color-inverse;
  color: $text-color-inverse;
  border-radius: $border-radius-base;
  box-shadow: 0 2px 10px rgba($color-neutral-0, 0.25);
  // Undo the header/cell text styling for a plain, readable tooltip.
  white-space: normal;
  overflow-wrap: anywhere;
  font-weight: normal;
  font-size: 0.9em;
  text-transform: none;
  letter-spacing: normal;
  line-height: 1.4;
  pointer-events: none;
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

<template>
  <os-card>
    <h2 class="title">{{ $t('admin.config.title') }}</h2>
    <p class="description">{{ $t('admin.config.description') }}</p>

    <!-- One row per environment variable the deployment recognises (its seed vars and
         its hard-requirement secrets). Read-only diagnostic mirror: it shows what the
         ENV provides, while the live effective values are edited on the policy tab.
         Columns run most-important → least: effective state, whether a policy overrides
         it, the env value, and the software default it falls back to. Secrets report
         presence only (never a value), so their value columns are em-dashed. -->
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
        <tbody>
          <tr
            v-for="row in rows"
            :id="row.anchor"
            :key="row.envKey"
            class="config-row"
            :class="{ 'config-row--blocking': row.blocking }"
            :data-test="`config-row-${row.envKey}`"
          >
            <!-- 1. Env variable — the actionable identity of the row. -->
            <th scope="row" class="cell cell--key">
              <code>{{ row.envKey }}</code>
            </th>

            <!-- 2. Effective state in operation: the policy's effective value for a seed
                 var, or the secret's presence (set / missing) for a hard requirement. -->
            <td class="cell cell--effective">
              <span v-if="row.kind === 'seed'" class="value">{{ row.effective }}</span>
              <template v-else>
                <span
                  class="badge"
                  :class="row.presence === 'set' ? 'badge--ok' : 'badge--error'"
                  :data-test="`config-state-${row.envKey}`"
                >
                  {{ $t(`admin.config.state.${row.presence}`) }}
                </span>
                <span v-if="row.blocking" class="cell__blocks">
                  {{ $t('admin.config.blocks', { policy: policyLabel(row.policyKey) }) }}
                </span>
              </template>
            </td>

            <!-- 3. Policy override: present only when an admin's live value diverges from
                 the configured default (env seed, else software default). -->
            <td class="cell">
              <span
                v-if="row.override !== null"
                class="value"
                :data-test="`config-override-${row.envKey}`"
              >
                {{ row.override }}
              </span>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.notSet') }}</span>
              </span>
            </td>

            <!-- 4. Env value: the seeded value when the env var is set, else nothing. -->
            <td class="cell">
              <code v-if="row.envValue !== null" :data-test="`config-envvalue-${row.envKey}`">
                {{ row.envValue }}
              </code>
              <span v-else class="cell-empty">
                <span aria-hidden="true">&mdash;</span>
                <span class="config-caption">{{ $t('admin.config.notSet') }}</span>
              </span>
            </td>

            <!-- 5. Software default: the code baseline the value falls back to. A secret
                 provides no value, so it has no software default. -->
            <td class="cell cell--muted">
              <code v-if="row.softwareDefault !== null">{{ row.softwareDefault }}</code>
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
import { policyConfigQuery } from '~/graphql/admin/PolicyConfig'

export default {
  components: { OsCard },
  middleware: ['isAdmin'],
  data() {
    return {
      policyConfig: [],
    }
  },
  apollo: {
    policyConfig: {
      query: policyConfigQuery,
      // Re-resolve against the CURRENT deployment state every time the tab is opened
      // (admin tabs are separate routes) — a stale cache could hide a just-fixed secret.
      fetchPolicy: 'cache-and-network',
    },
  },
  computed: {
    // One row per env variable, flattened from the per-policy config. A policy contributes
    // either a single seed row (its envSeed) or one row per hard-requirement secret
    // (requiresEnv) — every policy has at least one env var, so no policy is dropped.
    rows() {
      // Anchor the FIRST row of each policy with the policy key, so the policy tab's
      // "see config" link (/admin/config#<key>) lands here without duplicate element ids.
      const anchored = new Set()
      const anchorFor = (policyKey) => {
        if (anchored.has(policyKey)) return undefined
        anchored.add(policyKey)
        return policyKey
      }
      const out = []
      for (const entry of this.policyConfig) {
        if (entry.envSeed) {
          // A seed policy has no hard env requirement, so its effective value equals its
          // stored value — an override is therefore EXACTLY effective != configuredDefault
          // (the env-seed value if set, else the software default). No phantom overrides.
          const overridden = entry.effective !== entry.configuredDefault
          out.push({
            envKey: entry.envSeed,
            kind: 'seed',
            policyKey: entry.key,
            presence: entry.envSeedState,
            effective: this.fmt(entry.effective),
            override: overridden ? this.fmt(entry.effective) : null,
            // The env only contributes a value when it is actually set; empty/missing
            // falls back to the software default, so this cell is em-dashed.
            envValue: entry.envSeedState === 'set' ? this.fmt(entry.configuredDefault) : null,
            softwareDefault: this.fmt(entry.softwareDefault),
            blocking: false,
            anchor: anchorFor(entry.key),
          })
        }
        for (const req of entry.requiresEnv) {
          out.push({
            envKey: req.name,
            kind: 'required',
            policyKey: entry.key,
            presence: req.state,
            // A secret has no value: it gates availability only. Its effective cell shows
            // presence; its value columns are em-dashed.
            effective: null,
            override: null,
            envValue: null,
            softwareDefault: null,
            // Unmet hard requirement → the feature is broken regardless of its policy flag.
            blocking: req.state !== 'set',
            anchor: anchorFor(entry.key),
          })
        }
      }
      return out
    },
  },
  methods: {
    // Reuse the policy tab's human labels for policy keys (used in the "blocks …" hint).
    policyLabel(key) {
      return this.$t(`admin.policy.keys.${key}`)
    },
    // Pretty-print a JSON-encoded policy value for display.
    fmt(json) {
      try {
        return String(JSON.parse(json))
      } catch {
        return json
      }
    },
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
.config-row {
  // Reserve the accent gutter on every row so the layout doesn't shift when a row
  // becomes blocking; only a blocking row colours it.
  th.cell--key {
    border-left: 3px solid transparent;
  }

  // A missing hard-requirement secret breaks its feature → flag the whole row.
  &--blocking {
    background: rgba($color-danger, 0.07);

    th.cell--key {
      border-left-color: $color-danger;
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

<template>
  <os-card>
    <h2 class="title">{{ $t('admin.config.title') }}</h2>
    <p class="description">{{ $t('admin.config.description') }}</p>

    <!-- Required environment (hard): missing → the feature is broken; needs a redeploy. -->
    <section v-if="requiredEnv.length" class="layer" data-test="config-required">
      <h3 class="layer__title layer__title--required">{{ $t('admin.config.required.title') }}</h3>
      <p class="layer__hint">{{ $t('admin.config.required.hint') }}</p>
      <ul class="rows">
        <li
          v-for="entry in requiredEnv"
          :id="entry.policyKey"
          :key="`${entry.policyKey}-${entry.name}`"
          class="row"
          :data-test="`config-required-${entry.name}`"
        >
          <code class="row__name">{{ entry.name }}</code>
          <span class="badge" :class="entry.state === 'set' ? 'badge--ok' : 'badge--error'">
            {{ $t(`admin.config.state.${entry.state}`) }}
          </span>
          <span class="row__note">
            {{ $t('admin.config.requiredFor', { policy: policyLabel(entry.policyKey) }) }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Env-seeded defaults (soft): only seed the default; an admin can override live. -->
    <section v-if="seeded.length" class="layer" data-test="config-seeded">
      <h3 class="layer__title layer__title--seed">{{ $t('admin.config.seed.title') }}</h3>
      <p class="layer__hint">{{ $t('admin.config.seed.hint') }}</p>
      <ul class="rows">
        <li
          v-for="entry in seeded"
          :key="entry.key"
          class="row"
          :data-test="`config-seed-${entry.key}`"
        >
          <code class="row__name">{{ entry.envSeed }}</code>
          <span class="badge" :class="`badge--${seedSeverity(entry.envSeedState)}`">
            {{ $t(`admin.config.state.${entry.envSeedState}`) }}
          </span>
          <span class="row__note">
            {{
              $t('admin.config.seedsDefault', {
                policy: policyLabel(entry.key),
                value: fmt(entry.configuredDefault),
              })
            }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Software defaults (muted): the code baseline a key resets to without any config. -->
    <section class="layer" data-test="config-software">
      <h3 class="layer__title layer__title--software">{{ $t('admin.config.software.title') }}</h3>
      <p class="layer__hint">{{ $t('admin.config.software.hint') }}</p>
      <ul class="rows">
        <li
          v-for="entry in policyConfig"
          :key="entry.key"
          class="row row--muted"
          :data-test="`config-software-${entry.key}`"
        >
          <span class="row__name">{{ policyLabel(entry.key) }}</span>
          <code class="row__value">{{ fmt(entry.softwareDefault) }}</code>
        </li>
      </ul>
    </section>
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
    // Hard env requirements, flattened to one row per (policy, env var).
    requiredEnv() {
      return this.policyConfig.flatMap((entry) =>
        entry.requiresEnv.map((req) => ({
          policyKey: entry.key,
          name: req.name,
          state: req.state,
        })),
      )
    },
    // Policies whose default is seeded from an env var (soft override).
    seeded() {
      return this.policyConfig.filter((entry) => entry.envSeed)
    },
  },
  methods: {
    // Reuse the policy tab's human labels for policy keys.
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
    // Seed presence is soft: present → neutral info, absent → falls back to software
    // default (a warning at most, never an error like a hard requirement).
    seedSeverity(state) {
      return state === 'set' ? 'info' : 'warn'
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
.layer {
  margin-bottom: $space-base;

  &__title {
    margin: 0 0 $space-xxx-small;
    padding-bottom: $space-xxx-small;
    border-bottom: 2px solid $border-color-softer;
    font-size: 1em;

    // Severity-coded section headings.
    &--required {
      border-bottom-color: $color-danger;
    }
    &--seed {
      border-bottom-color: $color-primary;
    }
    &--software {
      border-bottom-color: $border-color-softer;
      color: $text-color-soft;
    }
  }
  &__hint {
    margin: 0 0 $space-x-small;
    color: $text-color-soft;
    font-size: 0.85em;
  }
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-x-small;
  margin: $space-xxx-small 0;

  &--muted {
    color: $text-color-soft;
    font-size: 0.9em;
  }
  &__name {
    font-weight: 600;
  }
  &__value {
    color: $text-color-soft;
  }
  &__note {
    color: $text-color-soft;
    font-size: 0.85em;
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
  &--warn {
    background-color: $color-warning;
    color: $color-warning-inverse;
  }
  &--error {
    background-color: $color-danger;
    color: $color-danger-inverse;
  }
  &--info {
    background-color: $color-primary;
    color: $color-primary-inverse;
  }
}
</style>

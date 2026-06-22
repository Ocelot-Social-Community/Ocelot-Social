<template>
  <os-card>
    <h2 class="title">{{ $t('admin.config.title') }}</h2>
    <p class="description">{{ $t('admin.config.description') }}</p>

    <section
      v-for="gate in systemConfig"
      :id="gate.gate"
      :key="gate.gate"
      class="gate"
      :data-test="`config-gate-${gate.gate}`"
    >
      <div class="gate__header">
        <h3 class="gate__title">{{ $t(`admin.config.gates.${gate.gate}`) }}</h3>
        <span
          class="badge"
          :class="gate.open ? 'badge--ok' : 'badge--error'"
          :data-test="`config-gate-${gate.gate}-status`"
        >
          {{
            gate.open ? $t('admin.config.statusConfigured') : $t('admin.config.statusNotConfigured')
          }}
        </span>
      </div>

      <!-- Runtime-changeable default: point at the policy tab instead of env keys. -->
      <p v-if="gate.source === 'policy'" class="gate__source">
        {{ $t('admin.config.sourcePolicy') }}
        <nuxt-link to="/admin/policy" class="gate__link">
          {{ $t('admin.config.policyLink') }}
        </nuxt-link>
      </p>

      <!-- Fixed at deploy time: list the underlying env keys with their presence state. -->
      <template v-else>
        <p class="gate__source">{{ $t('admin.config.sourceEnv') }}</p>
        <ul class="keys">
          <li
            v-for="entry in gate.keys"
            :key="entry.key"
            class="key"
            :data-test="`config-key-${entry.key}`"
          >
            <code class="key__name">{{ entry.key }}</code>
            <span class="badge" :class="`badge--${stateClass(entry.state)}`">
              {{ $t(`admin.config.state.${entry.state}`) }}
            </span>
            <span v-if="entry.secret" class="key__secret">{{ $t('admin.config.secretTag') }}</span>
            <code v-else-if="entry.value" class="key__value">{{ entry.value }}</code>
          </li>
        </ul>
      </template>
    </section>
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { systemConfigQuery } from '~/graphql/admin/SystemConfig'

export default {
  components: { OsCard },
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
  methods: {
    // Map the key presence state to a badge severity.
    stateClass(state) {
      if (state === 'set') return 'ok'
      if (state === 'empty') return 'warn'
      return 'error'
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
.gate {
  margin-bottom: $space-base;
  padding-bottom: $space-small;
  border-bottom: 1px solid $border-color-softer;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: $space-small;
  }
  &__title {
    margin: 0;
  }
  &__source {
    margin: $space-xx-small 0 $space-x-small;
    color: $text-color-soft;
    font-size: 0.9em;
  }
  &__link {
    white-space: nowrap;
  }
}
.keys {
  list-style: none;
  margin: 0;
  padding: 0;
}
.key {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-x-small;
  margin: $space-xxx-small 0;

  &__name {
    font-weight: 600;
  }
  &__value {
    color: $text-color-soft;
    word-break: break-all;
  }
  &__secret {
    color: $text-color-soft;
    font-size: 0.8em;
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
  &--warn {
    background-color: $color-warning;
    color: $color-warning-inverse;
  }
  &--error {
    background-color: $color-danger;
    color: $color-danger-inverse;
  }
}
</style>

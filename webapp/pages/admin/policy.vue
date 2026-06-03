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

    <form @submit.prevent="save" novalidate>
      <fieldset
        v-for="group in groups"
        :key="group.id"
        class="policy-group"
        :data-test="`policy-group-${group.id}`"
      >
        <legend class="policy-group__title">
          {{ $t(`admin.policy.groups.${group.id}.title`) }}
        </legend>

        <div v-for="key in group.keys" :key="key" class="policy-row">
          <input
            :id="`policy-${key}`"
            type="checkbox"
            class="policy-row__checkbox"
            v-model="form[key]"
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
            </span>
            <span class="policy-row__description">
              {{ $t(`admin.policy.descriptions.${key}`) }}
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

export default {
  components: { OsButton, OsCard },
  middleware: ['isAdmin'],
  data() {
    return {
      // Policies grouped under headings; related settings share a group.
      groups: [
        { id: 'registration', keys: ['publicRegistration', 'inviteRegistration'] },
        { id: 'features', keys: ['categoriesActive', 'apiKeysEnabled'] },
      ],
      form: {
        publicRegistration: false,
        inviteRegistration: false,
        categoriesActive: false,
        apiKeysEnabled: false,
      },
      saving: false,
      // Becomes true after the initial mount fetch so the snapshot watcher only
      // refetches the last-change info for *subsequent* (e.g. remote) changes.
      loaded: false,
    }
  },
  computed: {
    ...mapGetters({
      snapshot: 'policy/snapshot',
      defaults: 'policy/defaults',
      lastChange: 'policy/lastChange',
    }),
    // Flat list of all keys across groups — used by the form logic below.
    keys() {
      return this.groups.flatMap((group) => group.keys)
    },
    isDirty() {
      return this.keys.some((k) => this.form[k] !== this.snapshot[k])
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
    syncFormFromSnapshot() {
      this.keys.forEach((k) => {
        this.form[k] = this.snapshot[k]
      })
    },
    async save() {
      this.saving = true
      try {
        const changes = this.keys
          .filter((k) => this.form[k] !== this.snapshot[k])
          .map((key) => ({ key, value: this.form[key] }))
        for (const change of changes) {
          await this.setKey(change)
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
        this.syncFormFromSnapshot()
        // After the initial load, a snapshot change means someone (possibly a
        // remote admin, via the subscription) changed a policy. The broadcast
        // carries no actor/timestamp (Datensparsamkeit), so refetch the admin
        // bundle to keep the "last changed by … at …" line correct. Cheap and
        // page-scoped: only runs while this admin page is open. Fault-tolerant:
        // a failed refresh just leaves the last-changed line stale, never throws.
        if (this.loaded) this.fetchDefaults().catch(() => undefined)
      },
      deep: true,
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
.policy-row {
  display: flex;
  align-items: flex-start;
  gap: $space-x-small;
  margin: $space-xx-small 0;
  line-height: 1.3;

  &__checkbox {
    margin-top: 0.15em;
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
  &__description {
    color: $text-color-soft;
    font-size: 0.85em;
    line-height: 1.25;
  }
}
.actions {
  margin-top: $space-small;
  display: flex;
  gap: $space-small;
}
</style>

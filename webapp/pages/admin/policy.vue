<template>
  <os-card>
    <h2 class="title">{{ $t('admin.policy.title') }}</h2>
    <p class="description">{{ $t('admin.policy.description') }}</p>

    <form @submit.prevent="save" novalidate>
      <p v-for="key in keys" :key="key" class="ds-text policy-row">
        <input
          :id="`policy-${key}`"
          type="checkbox"
          v-model="form[key]"
          :data-test="`policy-${key}`"
        />
        <label :for="`policy-${key}`">
          {{ $t(`admin.policy.keys.${key}`) }}
        </label>
        <span class="policy-row__current">
          ({{ String(snapshot[key]) }})
        </span>
      </p>

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
      keys: ['publicRegistration', 'inviteRegistration', 'categoriesActive', 'apiKeysEnabled'],
      form: {
        publicRegistration: false,
        inviteRegistration: false,
        categoriesActive: false,
        apiKeysEnabled: false,
      },
      saving: false,
    }
  },
  computed: {
    ...mapGetters({ snapshot: 'policy/snapshot' }),
    isDirty() {
      return this.keys.some((k) => this.form[k] !== this.snapshot[k])
    },
  },
  methods: {
    ...mapActions({
      fetchPolicy: 'policy/init',
      setKey: 'policy/setKey',
      resetKey: 'policy/resetKey',
    }),
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
      },
      deep: true,
    },
  },
  async mounted() {
    await this.fetchPolicy()
    this.syncFormFromSnapshot()
  },
}
</script>

<style lang="scss" scoped>
.title {
  margin-bottom: $space-xx-small;
}
.description {
  margin-bottom: $space-base;
  color: $text-color-soft;
}
.policy-row {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  margin: $space-x-small 0;

  &__current {
    margin-left: auto;
    color: $text-color-soft;
    font-family: monospace;
    font-size: 0.85em;
  }
}
.actions {
  margin-top: $space-base;
  display: flex;
  gap: $space-small;
}
</style>

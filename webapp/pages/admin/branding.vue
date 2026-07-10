<template>
  <div>
    <os-card>
      <h2 class="ds-heading ds-heading-h2">{{ $t('admin.branding.title') }}</h2>
      <p>{{ $t('admin.branding.description') }}</p>

      <ul v-if="brandings.length" class="branding-list">
        <!-- Framework default (vanilla) — no baked-in brand. -->
        <li :class="{ active: activeId === '' }">
          <span class="branding-label">{{ $t('admin.branding.vanilla') }}</span>
          <span v-if="activeId === ''" class="branding-current">
            {{ $t('admin.branding.current') }}
          </span>
          <button v-else :disabled="!!saving" @click="switchTo('')">
            {{ $t('admin.branding.activate') }}
          </button>
        </li>
        <li v-for="b in brandings" :key="b.id" :class="{ active: activeId === b.id }">
          <span class="branding-label">
            {{ b.label || b.id }}
            <code>{{ b.id }}</code>
          </span>
          <span v-if="activeId === b.id" class="branding-current">
            {{ $t('admin.branding.current') }}
          </span>
          <button v-else :disabled="!!saving" @click="switchTo(b.id)">
            {{ $t('admin.branding.activate') }}
          </button>
        </li>
      </ul>
      <p v-else-if="$fetchState.pending">{{ $t('admin.branding.loading') }}</p>
      <p v-else>{{ $t('admin.branding.none') }}</p>
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { setActiveBrandingMutation } from '~/graphql/BrandingMutations'

export default {
  components: { OsCard },
  middleware: ['isAdmin'],
  // The list of baked-in brandings is a served asset (the branding-assets middleware writes
  // /branding/manifest.json), not a backend query — fetch it client-side.
  fetchOnServer: false,
  data() {
    return {
      brandings: [],
      saving: null,
    }
  },
  async fetch() {
    try {
      const res = await fetch('/branding/manifest.json')
      this.brandings = res.ok ? await res.json() : []
    } catch (error) {
      this.brandings = []
    }
  },
  computed: {
    // The live active branding id ('' = framework default). Kept live by the policy subscription.
    activeId() {
      return this.$policy.get('activeBranding') || ''
    },
  },
  methods: {
    async switchTo(id) {
      this.saving = id || 'vanilla'
      try {
        await this.$apollo.mutate({
          mutation: setActiveBrandingMutation(),
          variables: { id },
        })
        // The switch is broadcast via policyChanged; reload to fully apply the new brand
        // (config + assets + static-page HTML + build-time theme).
        window.location.reload()
      } catch (error) {
        this.$toast.error(this.$t('admin.branding.error'))
        this.saving = null
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.branding-list {
  list-style: none;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: $space-small;
    padding: $space-small 0;
    border-bottom: 1px solid $border-color-softer;

    &.active {
      font-weight: $font-weight-bold;
    }
  }

  .branding-label {
    flex: 1;
  }
}
</style>

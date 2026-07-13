<template>
  <div>
    <!-- 1. Composition (top): configure each bucket's source. A "complete package" preset sets the
         base for all buckets at once; per-bucket dropdowns override individual slots on top. -->
    <os-card>
      <h2 class="ds-heading ds-heading-h2">{{ $t('admin.branding.composition.title') }}</h2>
      <p>{{ $t('admin.branding.composition.description', { base: baseLabel }) }}</p>

      <div class="composition-row composition-row--base">
        <label for="whole-package" class="composition-label">
          {{ $t('admin.branding.composition.wholePackage') }}
        </label>
        <select
          id="whole-package"
          class="composition-select"
          :value="activeId"
          :disabled="!!saving"
          @change="switchTo($event.target.value)"
        >
          <option value="">{{ $t('admin.branding.vanilla') }}</option>
          <option v-for="src in sourceOptions" :key="src.id" :value="src.id">
            {{ src.label }}
          </option>
        </select>
      </div>

      <div v-for="bucket in bucketNames" :key="bucket" class="composition-row">
        <label :for="`bucket-${bucket}`" class="composition-label">
          {{ $t(`admin.branding.composition.bucket.${bucket}`) }}
        </label>
        <select
          :id="`bucket-${bucket}`"
          class="composition-select"
          :value="composition[bucket] || ''"
          :disabled="!!savingComposition"
          @change="setSource(bucket, $event.target.value)"
        >
          <option value="">
            {{ $t('admin.branding.composition.inherit', { base: baseLabel }) }}
          </option>
          <option v-for="src in sourceOptions" :key="src.id" :value="src.id">
            {{ src.label }}
          </option>
        </select>
      </div>
    </os-card>

    <!-- 2. Available brandings (bottom): a compact, read-only reference of each baked-in branding and
         the buckets it provides — brandings are composed above, not activated here. -->
    <os-card class="available-card">
      <h2 class="ds-heading ds-heading-h2">{{ $t('admin.branding.available.title') }}</h2>
      <p v-if="$fetchState.pending" class="hint">{{ $t('admin.branding.loading') }}</p>
      <p v-else-if="!brandings.length" class="hint">{{ $t('admin.branding.noneExtra') }}</p>
      <ul v-else class="available-list">
        <li v-for="b in brandings" :key="b.id" class="available-item">
          <img v-if="logo(b)" class="available-logo" :src="logo(b)" :alt="b.label || b.id" />
          <span class="available-name">
            {{ b.label || b.id }}
            <code v-if="b.version" class="branding-version">v{{ b.version }}</code>
          </span>
          <span class="available-buckets">
            <code
              v-for="inst in providedBuckets[b.id] || []"
              :key="inst.type + '.' + inst.name"
              class="bucket-tag"
            >
              {{ inst.type }}
              <template v-if="inst.name !== 'default'">/{{ inst.name }}</template>
            </code>
          </span>
        </li>
      </ul>
    </os-card>
  </div>
</template>

<script>
import { BUCKET_NAMES } from '@ocelot-social/branding'
import { OsCard } from '@ocelot-social/ui'
import {
  setActiveBrandingMutation,
  setBrandingCompositionMutation,
} from '~/graphql/BrandingMutations'

export default {
  components: { OsCard },
  middleware: ['isAdmin'],
  // The baked-in brandings are served assets (the branding-assets middleware), not a backend query —
  // fetch the aggregate list plus each brand's own manifest (the buckets it provides) client-side.
  fetchOnServer: false,
  data() {
    return {
      brandings: [],
      // brand id → its manifest instances ([{ type, name, file }]) = the buckets it provides.
      providedBuckets: {},
      // brand id → its composed config (branding.json) — for the favicon & logo preview.
      details: {},
      saving: null,
      // Local editable copy of the per-slot composition (brandingComposition policy value, parsed).
      composition: {},
      savingComposition: false,
    }
  },
  mounted() {
    // Initialise the composition editor from the live policy value (client-only; policy is loaded).
    this.composition = this.readComposition()
  },
  async fetch() {
    let list = []
    try {
      const res = await fetch('/branding/manifest.json')
      list = res.ok ? await res.json() : []
    } catch (error) {
      list = []
    }
    const providedBuckets = {}
    const details = {}
    await Promise.all(
      list.flatMap((b) => [
        // the buckets a brand provides (its manifest instances)
        (async () => {
          try {
            const res = await fetch(`/branding/${b.id}/manifest.json`)
            if (res.ok) {
              const manifest = await res.json()
              providedBuckets[b.id] = Array.isArray(manifest.instances) ? manifest.instances : []
            }
          } catch (error) {
            // the bucket list degrades gracefully when a manifest can't be loaded
          }
        })(),
        // its composed config, for the favicon & logo preview
        (async () => {
          try {
            const res = await fetch(b.config)
            if (res.ok) details[b.id] = await res.json()
          } catch (error) {
            // preview degrades gracefully when a config can't be loaded
          }
        })(),
      ]),
    )
    this.brandings = list
    this.providedBuckets = providedBuckets
    this.details = details
  },
  computed: {
    // The live base brand id ('' = framework default). Kept live by the policy subscription.
    activeId() {
      return this.$policy.get('activeBranding') || ''
    },
    // The six composable bucket slots (theme/identity/logos/legal/navigation/behavior).
    bucketNames() {
      return BUCKET_NAMES
    },
    // Label of the base brand (the "complete package"), shown as the "inherit" option per slot.
    baseLabel() {
      if (!this.activeId) return this.$t('admin.branding.vanilla')
      const base = this.brandings.find((b) => b.id === this.activeId)
      return base ? base.label || base.id : this.activeId
    },
    // Brands a slot (or the whole package) can be sourced from.
    sourceOptions() {
      return this.brandings.map((b) => ({ id: b.id, label: b.label || b.id }))
    },
  },
  methods: {
    // Header logo of a brand (from its composed config), for the available-list preview.
    logo(b) {
      const config = this.details[b.id]
      return (config && config.logos && config.logos.headerPath) || ''
    },
    // Parse the live brandingComposition policy value ('' or a JSON slot→source object).
    readComposition() {
      const raw = this.$policy.get('brandingComposition') || ''
      if (!raw) return {}
      try {
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch (error) {
        return {}
      }
    },
    // The base "complete package" (activeBranding) — presets all buckets to this brand at once.
    async switchTo(id) {
      this.saving = id || 'vanilla'
      try {
        await this.$apollo.mutate({
          mutation: setActiveBrandingMutation(),
          variables: { id },
        })
        // Broadcast via policyChanged; reload to fully apply (config + assets + static HTML + theme).
        window.location.reload()
      } catch (error) {
        this.$toast.error(this.$t('admin.branding.error'))
        this.saving = null
      }
    },
    // Set one slot's source ('' = inherit the base package → remove the override) and persist.
    setSource(bucket, id) {
      const next = { ...this.composition }
      if (id) next[bucket] = id
      else delete next[bucket]
      this.composition = next
      this.saveComposition()
    },
    async saveComposition() {
      // Only keep non-empty slot overrides; an empty map clears the policy value.
      const map = {}
      for (const bucket of this.bucketNames) {
        if (this.composition[bucket]) map[bucket] = this.composition[bucket]
      }
      const composition = Object.keys(map).length ? JSON.stringify(map) : ''
      this.savingComposition = true
      try {
        await this.$apollo.mutate({
          mutation: setBrandingCompositionMutation(),
          variables: { composition },
        })
        // Broadcast via policyChanged; reload to fully apply the recomposed branding.
        window.location.reload()
      } catch (error) {
        this.$toast.error(this.$t('admin.branding.error'))
        this.savingComposition = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.composition-row {
  display: flex;
  align-items: center;
  gap: $space-small;
  padding: $space-x-small 0;
  border-bottom: 1px solid $border-color-softer;

  &:last-child {
    border-bottom: none;
  }

  &--base {
    // The whole-package preset sits above the per-slot rows, set apart with a heavier divider.
    border-bottom: 2px solid $border-color-soft;
    padding-bottom: $space-small;
    margin-bottom: $space-x-small;
  }
}

.composition-label {
  flex: 1;
  font-weight: $font-weight-bold;
}

.composition-select {
  min-width: 220px;
  padding: $space-xx-small $space-x-small;
}

.available-card {
  margin-top: $space-base;
}

.available-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.available-item {
  display: flex;
  align-items: baseline;
  gap: $space-small;
  padding: $space-x-small 0;
  border-bottom: 1px solid $border-color-softer;

  &:last-child {
    border-bottom: none;
  }
}

.available-logo {
  flex: 0 0 auto;
  height: 20px;
  width: auto;
  max-width: 120px;
}

.available-name {
  flex: 0 0 auto;
  font-weight: $font-weight-bold;
}

.available-buckets {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: $space-xx-small;
  justify-content: flex-end;
}

.bucket-tag {
  background-color: $background-color-softest;
  color: $text-color-soft;
  padding: 1px 6px;
  border-radius: $border-radius-base;
  font-size: $font-size-small;
}

.branding-version {
  color: $text-color-soft;
  font-weight: normal;
}

.hint {
  color: $text-color-soft;
}
</style>

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

      <div v-for="bucket in bucketNames" :key="bucket" class="composition-bucket">
        <div class="composition-row">
          <button
            type="button"
            class="composition-caret"
            :aria-expanded="!!expanded[bucket]"
            :aria-label="$t('admin.branding.composition.details')"
            @click="toggle(bucket)"
          >
            {{ expanded[bucket] ? '▾' : '▸' }}
          </button>
          <label :for="`bucket-${bucket}`" class="composition-label">
            {{ $t(`admin.branding.composition.bucket.${bucket}`) }}
          </label>
          <select
            :id="`bucket-${bucket}`"
            class="composition-select"
            :value="selectValue(bucket)"
            :disabled="!!savingComposition"
            @change="onBucketChange(bucket, $event.target.value)"
          >
            <option value="">
              {{ $t('admin.branding.composition.inherit', { base: baseLabel }) }}
            </option>
            <option :value="vanillaSource">
              {{ $t('admin.branding.composition.frameworkDefault') }}
            </option>
            <option v-for="src in sourceOptions" :key="src.id" :value="src.id">
              {{ src.label }}
            </option>
          </select>
        </div>

        <div v-if="expanded[bucket]" class="composition-details">
          <p class="composition-source">
            <template v-if="hasPending(bucket)">
              {{
                $t('admin.branding.composition.change', {
                  from: sourceLabelFor(bucket),
                  to: pendingLabelFor(bucket),
                })
              }}
            </template>
            <template v-else>
              {{ $t('admin.branding.composition.from', { source: sourceLabelFor(bucket) }) }}
            </template>
          </p>
          <dl class="detail-list">
            <div
              v-for="d in bucketDetails(bucket)"
              :key="d.path"
              class="detail-row"
              :class="`detail-row--${d.status}`"
            >
              <dt>{{ d.path }}</dt>
              <dd>
                <template v-if="d.status === 'changed'">
                  <span class="detail-old">{{ display(d.oldValue) }}</span>
                  <span class="detail-arrow">→</span>
                </template>
                <span
                  v-if="isColor(d.value)"
                  class="swatch"
                  :style="{ backgroundColor: d.value }"
                />
                <img v-if="isImage(d.value)" class="detail-img" :src="d.value" alt="" />
                <span
                  class="detail-value"
                  :class="{
                    'detail-value--removed': d.status === 'removed',
                    'detail-value--default': d.isDefault,
                  }"
                >
                  {{ display(d.value) }}
                </span>
                <span v-if="d.isDefault" class="detail-default-tag">
                  {{ $t('admin.branding.composition.defaultTag') }}
                </span>
              </dd>
            </div>
            <div v-if="!bucketDetails(bucket).length" class="detail-row">
              <dd class="detail-empty">{{ $t('admin.branding.composition.noDetails') }}</dd>
            </div>
          </dl>

          <div v-if="hasPending(bucket)" class="detail-actions">
            <button
              type="button"
              class="btn btn-confirm"
              :disabled="!!savingComposition"
              @click="confirm(bucket)"
            >
              {{ $t('admin.branding.composition.confirm') }}
            </button>
            <button
              type="button"
              class="btn btn-cancel"
              :disabled="!!savingComposition"
              @click="cancel(bucket)"
            >
              {{ $t('actions.cancel') }}
            </button>
          </div>
        </div>
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
          <span class="available-logo-slot">
            <img v-if="logo(b)" class="available-logo" :src="logo(b)" :alt="b.label || b.id" />
          </span>
          <span class="available-name">
            {{ b.label || b.id }}
            <code v-if="b.version" class="branding-version">v{{ b.version }}</code>
            <code
              v-if="schemaVersions[b.id]"
              class="branding-version schema-version"
              :title="$t('admin.branding.schemaTitle')"
            >
              {{ $t('admin.branding.schema') }} {{ schemaVersions[b.id] }}
            </code>
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
import {
  BUCKET_NAMES,
  brandingDefaults,
  extractBucket,
  THEME_DEFAULTS,
} from '@ocelot-social/branding'
import { OsCard } from '@ocelot-social/ui'
import {
  setActiveBrandingMutation,
  setBrandingCompositionMutation,
} from '~/graphql/BrandingMutations'

// Sentinel slot source meaning "use the framework default (vanilla)" for THIS bucket — distinct from
// "" (inherit the base package). Stored verbatim in the composition; the SSR resolver's parseSource
// maps '@default' to null (no id → framework default), so no resolver special-casing is needed.
const VANILLA_SOURCE = '@default'

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
      // brand id → the @ocelot-social/branding package version the archive was built with.
      schemaVersions: {},
      saving: null,
      // Local editable copy of the per-slot composition (brandingComposition policy value, parsed).
      composition: {},
      savingComposition: false,
      // Which bucket rows are expanded to show the selected source's details.
      expanded: {},
      // Staged (unconfirmed) per-bucket select changes, awaiting confirmation. bucket → source value.
      pending: {},
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
    const schemaVersions = {}
    await Promise.all(
      list.flatMap((b) => [
        // the buckets a brand provides + the branding package version it was built with (its manifest)
        (async () => {
          try {
            const res = await fetch(`/branding/${b.id}/manifest.json`)
            if (res.ok) {
              const manifest = await res.json()
              providedBuckets[b.id] = Array.isArray(manifest.instances) ? manifest.instances : []
              schemaVersions[b.id] = manifest.schemaVersion || null
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
    this.schemaVersions = schemaVersions
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
    // The sentinel select value for "framework default" (exposed to the template).
    vanillaSource() {
      return VANILLA_SOURCE
    },
  },
  methods: {
    // Header logo of a brand (from its composed config), for the available-list preview.
    logo(b) {
      const config = this.details[b.id]
      return (config && config.logos && config.logos.headerPath) || ''
    },
    toggle(bucket) {
      // Vue 2: replace the object so the template reacts to the new expanded state.
      this.expanded = { ...this.expanded, [bucket]: !this.expanded[bucket] }
    },
    // Resolve a raw SELECT value to its config: '' = inherit the base package; the vanilla sentinel =
    // framework defaults; a brand id = that brand's config.
    configForSelect(select) {
      if (select === VANILLA_SOURCE) return brandingDefaults
      const id = select || this.activeId // inherit → base
      if (!id) return brandingDefaults
      return this.details[id] || {}
    },
    labelForSelect(select) {
      if (select === VANILLA_SOURCE) return this.$t('admin.branding.composition.frameworkDefault')
      const id = select || this.activeId
      if (!id) return this.$t('admin.branding.vanilla')
      const b = this.brandings.find((x) => x.id === id)
      return b ? b.label || b.id : id
    },
    sourceLabelFor(bucket) {
      return this.labelForSelect(this.composition[bucket] || '')
    },
    pendingLabelFor(bucket) {
      return this.labelForSelect(this.pending[bucket])
    },
    // path → framework-default value for a bucket, to flag rows the source doesn't actually set.
    // For `theme`, the overridable colour/font palette lives in :root SCSS (not theme.cssVars), so
    // seed it from THEME_DEFAULTS — otherwise vanilla/most brands would show no colours at all.
    defaultsMap(bucket) {
      const map = {}
      this.flatten(extractBucket(brandingDefaults, bucket)).forEach((r) => {
        map[r.path] = r.value
      })
      if (bucket === 'theme') {
        for (const [key, value] of Object.entries(THEME_DEFAULTS)) {
          map[`theme.cssVars.${key}`] = value
        }
      }
      return map
    },
    eqv(a, b) {
      return JSON.stringify(a) === JSON.stringify(b)
    },
    // Flatten a source config's bucket slice; for `theme`, ADD every overridable palette token that
    // the source doesn't set (with its framework default) so all colours are always listed.
    bucketRows(select, bucket) {
      const config = this.configForSelect(select)
      const rows = this.flatten(extractBucket(config, bucket))
      if (bucket !== 'theme') return rows
      const cssVars = (config.theme && config.theme.cssVars) || {}
      const present = new Set(rows.map((r) => r.path))
      for (const key of Object.keys(THEME_DEFAULTS)) {
        const path = `theme.cssVars.${key}`
        if (present.has(path)) continue
        const value = cssVars[key] !== undefined ? cssVars[key] : THEME_DEFAULTS[key]
        rows.push({ path, value })
      }
      return rows
    },
    // The bucket's detail rows. Without a pending change: the current source's values. With one: a
    // DIFF (union of paths) marked same/changed/added/removed vs. the current source. Every row also
    // carries `isDefault` — true when the value equals the framework default (i.e. not set by the
    // source), so the UI can grey it out.
    bucketDetails(bucket) {
      const defaults = this.defaultsMap(bucket)
      const mark = (rows) =>
        rows.map((r) => ({ ...r, isDefault: this.eqv(r.value, defaults[r.path]) }))

      const newSelect = this.hasPending(bucket)
        ? this.pending[bucket]
        : this.composition[bucket] || ''
      const newRows = this.bucketRows(newSelect, bucket)
      if (!this.hasPending(bucket)) return mark(newRows.map((r) => ({ ...r, status: 'same' })))

      const oldRows = this.bucketRows(this.composition[bucket] || '', bucket)
      const oldMap = {}
      oldRows.forEach((r) => {
        oldMap[r.path] = r.value
      })
      const newMap = {}
      newRows.forEach((r) => {
        newMap[r.path] = r.value
      })
      const paths = [...new Set([...oldRows.map((r) => r.path), ...newRows.map((r) => r.path)])]
      return mark(
        paths.map((path) => {
          const inOld = path in oldMap
          const inNew = path in newMap
          let status = 'same'
          if (inOld && !inNew) status = 'removed'
          else if (!inOld && inNew) status = 'added'
          else if (JSON.stringify(oldMap[path]) !== JSON.stringify(newMap[path])) status = 'changed'
          return {
            path,
            value: inNew ? newMap[path] : oldMap[path],
            oldValue: oldMap[path],
            status,
          }
        }),
      )
    },
    flatten(obj, prefix = '') {
      const out = []
      for (const [key, value] of Object.entries(obj || {})) {
        const path = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          out.push(...this.flatten(value, path))
        } else {
          out.push({ path, value })
        }
      }
      return out
    },
    isColor(v) {
      return typeof v === 'string' && /^(#|rgb|hsl)/i.test(v.trim())
    },
    isImage(v) {
      return typeof v === 'string' && /\.(svg|png|jpe?g|webp|gif|ico)(\?|$)/i.test(v)
    },
    display(v) {
      if (v === null || v === undefined || v === '') return '–'
      if (Array.isArray(v)) return v.length ? JSON.stringify(v) : '[]'
      if (typeof v === 'boolean') return v ? '✓' : '✗'
      return String(v)
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
    // The value the select shows: the pending (unsaved) choice if any, else the saved override.
    selectValue(bucket) {
      return bucket in this.pending ? this.pending[bucket] : this.composition[bucket] || ''
    },
    hasPending(bucket) {
      return bucket in this.pending
    },
    // A select change does NOT persist immediately — it stages a pending choice, expands the bucket
    // and shows the diff for confirmation. Selecting the current value again clears the pending state.
    onBucketChange(bucket, value) {
      const current = this.composition[bucket] || ''
      const pending = { ...this.pending }
      if (value === current) delete pending[bucket]
      else pending[bucket] = value
      this.pending = pending
      if (bucket in this.pending) this.expanded = { ...this.expanded, [bucket]: true }
    },
    clearPending(bucket) {
      const pending = { ...this.pending }
      delete pending[bucket]
      this.pending = pending
    },
    // Confirm the pending change: write it into the composition and persist (reloads).
    confirm(bucket) {
      const value = this.pending[bucket]
      const next = { ...this.composition }
      if (value) next[bucket] = value
      else delete next[bucket]
      this.composition = next
      this.clearPending(bucket)
      this.saveComposition()
    },
    // Discard the pending change; the select reverts to the saved value on re-render.
    cancel(bucket) {
      this.clearPending(bucket)
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
.composition-bucket {
  border-bottom: 1px solid $border-color-softer;

  &:last-child {
    border-bottom: none;
  }
}

.composition-row {
  display: flex;
  align-items: center;
  gap: $space-small;
  padding: $space-x-small 0;

  &--base {
    // The whole-package preset sits above the per-slot rows, set apart with a heavier divider.
    border-bottom: 2px solid $border-color-soft;
    padding-bottom: $space-small;
    margin-bottom: $space-x-small;
  }
}

.composition-caret {
  flex: 0 0 auto;
  border: none;
  background: none;
  cursor: pointer;
  color: $text-color-soft;
  padding: 0 $space-xx-small;
  font-size: $font-size-small;
}

.composition-label {
  flex: 1;
  font-weight: $font-weight-bold;
}

.composition-select {
  // Fixed identical width so the base (whole-package) select and every per-bucket select line up,
  // regardless of the selected option's text length.
  flex: 0 0 auto;
  width: 280px;
  max-width: 100%;
  padding: $space-xx-small $space-x-small;
}

.composition-details {
  padding: 0 0 $space-small $space-base;
}

.composition-source {
  margin: 0 0 $space-x-small;
  color: $text-color-soft;
  font-size: $font-size-small;
}

.detail-list {
  margin: 0;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: $space-small;
  padding: 1px 0;

  dt {
    flex: 0 0 40%;
    color: $text-color-soft;
    font-size: $font-size-small;
    word-break: break-all;
  }

  dd {
    flex: 1;
    margin: 0;
    display: flex;
    align-items: center;
    gap: $space-x-small;
    font-size: $font-size-small;
  }

  // Diff highlighting for a staged (pending) change: changed / added / removed.
  &--changed {
    background-color: color-mix(in srgb, var(--color-warning) 12%, transparent);
  }

  &--added {
    background-color: color-mix(in srgb, var(--color-success) 12%, transparent);
  }

  &--removed {
    background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
  }
}

.detail-value {
  word-break: break-word;

  &--removed {
    text-decoration: line-through;
    color: $text-color-soft;
  }

  // A value the source does not actually set (equals the framework default) — greyed out.
  &--default {
    color: $text-color-softer;
  }
}

.detail-default-tag {
  color: $text-color-softer;
  font-size: $font-size-x-small;
  font-style: italic;
}

.detail-old {
  color: $text-color-soft;
  text-decoration: line-through;
}

.detail-arrow {
  color: $text-color-soft;
}

.detail-actions {
  display: flex;
  gap: $space-x-small;
  margin-top: $space-small;
}

.btn {
  border: none;
  border-radius: $border-radius-base;
  padding: 4px 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.btn-confirm {
  background-color: $color-primary;
  color: $color-primary-inverse;
}

.btn-cancel {
  background-color: $background-color-softest;
  color: $text-color-base;
}

.detail-empty {
  color: $text-color-soft;
  font-style: italic;
}

.detail-img {
  max-height: 20px;
  max-width: 80px;
  object-fit: contain;
}

.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid $border-color-softer;
  flex: 0 0 auto;
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

.available-logo-slot {
  // Fixed-width column so the brand names line up regardless of each logo's aspect ratio (and stay
  // aligned for brands without a logo).
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  height: 24px;
}

.available-logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: left center;
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

.schema-version {
  border: 1px solid $border-color-softer;
  border-radius: $border-radius-base;
  padding: 0 4px;
  font-size: $font-size-small;
}

.hint {
  color: $text-color-soft;
}
</style>

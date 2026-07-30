<template>
  <div>
    <!-- 1. Composition (top): configure each bucket's source. A "complete package" preset sets the
         base for all buckets at once; per-bucket dropdowns override individual slots on top. -->
    <os-card>
      <h2 class="ds-heading ds-heading-h2">{{ $t('admin.branding.composition.title') }}</h2>
      <p>{{ $t('admin.branding.composition.description', { base: baseLabel }) }}</p>

      <div class="composition-base">
        <div class="composition-row composition-row--base">
          <button
            v-if="activeId"
            type="button"
            class="composition-caret"
            :aria-expanded="expandedBase"
            :aria-label="$t('admin.branding.composition.details')"
            @click="expandedBase = !expandedBase"
          >
            {{ expandedBase ? '▾' : '▸' }}
          </button>
          <span v-else class="composition-caret-spacer" />
          <label for="whole-package" class="composition-label">
            {{ $t('admin.branding.composition.wholePackage') }}
          </label>
          <select
            id="whole-package"
            class="composition-select"
            :value="activeSelect"
            :disabled="!!saving || !!savingComposition"
            @change="switchTo($event.target.value)"
          >
            <option :value="vanillaSource">{{ $t('admin.branding.vanilla') }}</option>
            <option v-for="src in sourceOptions" :key="src.id" :value="src.id">
              {{ src.label }}
            </option>
          </select>
        </div>

        <div v-if="expandedBase && activeId" class="composition-details">
          <dl class="detail-list">
            <div class="detail-row">
              <dt>{{ $t('admin.branding.available.title') }}</dt>
              <dd>
                {{ baseLabel }}
                <code v-if="baseVersion" class="branding-version">v{{ baseVersion }}</code>
                <code v-if="schemaVersions[activeId]" class="branding-version schema-version">
                  {{ $t('admin.branding.schema') }} {{ schemaVersions[activeId] }}
                </code>
              </dd>
            </div>
            <div v-if="baseOrganization" class="detail-row">
              <dt>{{ $t('admin.branding.detail.organization') }}</dt>
              <dd>{{ baseOrganization }}</dd>
            </div>
            <div class="detail-row">
              <dt>{{ $t('admin.branding.composition.provides') }}</dt>
              <dd>
                <span class="available-buckets">
                  <code
                    v-for="inst in providedBuckets[activeId] || []"
                    :key="inst.type + '.' + inst.name"
                    class="bucket-tag"
                  >
                    {{ inst.type }}
                    <template v-if="inst.name !== 'default'">/{{ inst.name }}</template>
                  </code>
                </span>
              </dd>
            </div>
          </dl>
          <p class="composition-source">{{ $t('admin.branding.composition.unprovidedInherit') }}</p>
        </div>
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
            :disabled="!!savingComposition || !!saving"
            @change="onBucketChange(bucket, $event.target.value)"
          >
            <!-- Inheriting is only offered when the base package actually carries this bucket;
                 otherwise the slot runs the framework default and says so. -->
            <option v-if="providesBucket(activeId, bucket)" value="">
              {{ $t('admin.branding.composition.inherit', { base: baseLabel }) }}
            </option>
            <option :value="vanillaSource">
              {{ $t('admin.branding.composition.frameworkDefault') }}
            </option>
            <option v-for="src in sourceOptionsFor(bucket)" :key="src.id" :value="src.id">
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
                  <span
                    v-if="isColor(d.oldValue)"
                    class="swatch swatch--old"
                    :style="{ backgroundColor: d.oldValue }"
                  />
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
              :disabled="!!savingComposition || !!saving"
              @click="confirm(bucket)"
            >
              {{ $t('admin.branding.composition.confirm') }}
            </button>
            <button
              type="button"
              class="btn btn-cancel"
              :disabled="!!savingComposition || !!saving"
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
            <!-- The brand this page is currently composed from, and the deployment's baked fallback.
                 Both can apply to the same entry. -->
            <span v-if="b.id === activeId" class="branding-badge branding-badge-active">
              {{ $t('admin.branding.available.active') }}
            </span>
            <span v-if="b.isDefault" class="branding-badge">
              {{ $t('admin.branding.available.default') }}
            </span>
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
      // Whether the whole-package (base) row is expanded to show the selected package's details.
      expandedBase: false,
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
    // The framework default is NOT an archive — it has no `.tar.gz`, so discovery can never report it
    // and the manifest never contains it. It is nevertheless a real, selectable source (every bucket
    // falls back to it, and the composition editor offers it per slot), so list it explicitly as the
    // first entry instead of leaving the admin to infer it. Synthesised here, with the same shape the
    // real entries have: id '' matches `activeId` when no brand is switched on, so it gets the
    // "active base" badge exactly when it IS the base.
    const vanilla = {
      id: '',
      label: this.$t('admin.branding.vanilla'),
      version: null,
      isDefault: false,
      isVanilla: true,
    }
    details[vanilla.id] = brandingDefaults
    // Vanilla backs every slot by definition — that is what "framework default" means.
    providedBuckets[vanilla.id] = BUCKET_NAMES.map((type) => ({ type, name: 'default' }))

    // Then the deployment's baked default — the brand every unswitched visitor actually sees. The
    // rest keeps the manifest's own order.
    const archives = [...list].sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault))
    this.brandings = [vanilla, ...archives]
    this.providedBuckets = providedBuckets
    this.details = details
    this.schemaVersions = schemaVersions
  },
  computed: {
    // The raw stored value — '' (never chosen) or the vanilla sentinel or a brand id. Only the
    // whole-package select needs it, so its option can round-trip the sentinel.
    activeSelect() {
      return this.$policy.get('activeBranding') || ''
    },
    // The live base brand id, normalised: '' means framework defaults, whether that is because
    // nothing was ever chosen or because vanilla was chosen explicitly. Everything that looks a brand
    // up by id (labels, badges, config preview) uses this.
    activeId() {
      const raw = this.activeSelect
      return raw === VANILLA_SOURCE ? '' : raw
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
    // Brands a slot (or the whole package) can be sourced from — ARCHIVES only. The framework default
    // is listed below for reference but must not appear here: both selects already offer it as their
    // own fixed option (the whole-package select as `value=""`, a slot select additionally as the
    // vanilla sentinel), so including it would render a duplicate entry with the same value.
    sourceOptions() {
      return this.brandings
        .filter((b) => !b.isVanilla)
        .map((b) => ({ id: b.id, label: b.label || b.id }))
    },
    // The sentinel select value for "framework default" (exposed to the template).
    vanillaSource() {
      return VANILLA_SOURCE
    },
    // Details of the selected whole-package (base brand), for its expandable panel.
    baseVersion() {
      const b = this.brandings.find((x) => x.id === this.activeId)
      return (b && b.version) || null
    },
    baseOrganization() {
      const config = this.details[this.activeId]
      return (config && config.metadata && config.metadata.organizationName) || ''
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
      return this.labelForSelect(this.effectiveSelect(bucket))
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
        : this.effectiveSelect(bucket)
      const newRows = this.bucketRows(newSelect, bucket)
      if (!this.hasPending(bucket)) return mark(newRows.map((r) => ({ ...r, status: 'same' })))

      const oldRows = this.bucketRows(this.effectiveSelect(bucket), bucket)
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
      // Literal colours plus var()/color-mix() references — the browser resolves the latter for the
      // swatch's background-color, so a token that defaults to `var(--color-primary)` still shows one.
      return typeof v === 'string' && /^(#|rgb|hsl|var\(|color-mix\()/i.test(v.trim())
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
    // Whether `id` ships a fragment for this bucket. An archive only carries the buckets its brand
    // actually customises (build-brandings skips a bucket whose slice equals the framework default),
    // so "provides" is what the archive manifest lists — not "is a brand". Vanilla is synthesised
    // with all six in fetch(): the framework default backs every slot by definition.
    providesBucket(id, bucket) {
      return (this.providedBuckets[id] || []).some((inst) => inst && inst.type === bucket)
    },
    // Sources selectable for THIS slot: only brands that actually carry the bucket. Offering the rest
    // was misleading — picking one changed nothing, because an absent fragment composes to the
    // framework default. The currently stored source stays listed even when it does not provide the
    // bucket (an older composition, or a brand that dropped it since), so the select keeps showing the
    // state instead of falling back to a blank entry.
    sourceOptionsFor(bucket) {
      const stored = this.composition[bucket] || ''
      return this.sourceOptions.filter(
        (src) => this.providesBucket(src.id, bucket) || src.id === stored,
      )
    },
    // The source a slot RUNS on. Normally the stored override ('' = inherit the base package), but
    // when inheriting from a package without this bucket the slot effectively runs the framework
    // default — and since that row is not offered, the select would otherwise show a blank value.
    // Only the DISPLAY resolves this way: '' stays stored, so switching the base package later to one
    // that does carry the bucket still pulls this slot along.
    effectiveSelect(bucket) {
      const stored = this.composition[bucket] || ''
      if (stored) return stored
      return this.providesBucket(this.activeId, bucket) ? '' : VANILLA_SOURCE
    },
    // The value the select shows: the pending (unsaved) choice if any, else the effective source.
    selectValue(bucket) {
      return bucket in this.pending ? this.pending[bucket] : this.effectiveSelect(bucket)
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
      // Persist FIRST; the local state (composition + pending) is committed only on success (see
      // saveComposition) so a failed mutation leaves the pending change intact for retry/cancel
      // instead of showing it as applied.
      this.saveComposition(next, bucket)
    },
    // Discard the pending change; the select reverts to the saved value on re-render.
    cancel(bucket) {
      this.clearPending(bucket)
    },
    async saveComposition(next, bucket) {
      // Only keep non-empty slot overrides; an empty map clears the policy value.
      const map = {}
      for (const b of this.bucketNames) {
        if (next[b]) map[b] = next[b]
      }
      const composition = Object.keys(map).length ? JSON.stringify(map) : ''
      this.savingComposition = true
      try {
        await this.$apollo.mutate({
          mutation: setBrandingCompositionMutation(),
          variables: { composition },
        })
        // Server accepted it → commit locally, then reload to fully apply the recomposed branding.
        this.composition = next
        this.clearPending(bucket)
        window.location.reload()
      } catch (error) {
        // Leave this.composition + pending untouched so the failed change stays pending (retry/cancel).
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

.composition-caret,
.composition-caret-spacer {
  flex: 0 0 auto;
  width: 20px;
}

.composition-caret {
  border: none;
  background: none;
  cursor: pointer;
  color: $text-color-soft;
  padding: 0;
  text-align: center;
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

  // The old (replaced) colour of a changed row — dimmed to match its struck-through text.
  &--old {
    opacity: 0.6;
  }
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

.branding-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border: 1px solid $border-color-softer;
  border-radius: $border-radius-base;
  font-size: $font-size-small;
  font-weight: normal;
  color: $text-color-soft;
  vertical-align: middle;
}

.branding-badge-active {
  border-color: $color-primary;
  color: $color-primary;
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

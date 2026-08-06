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
            :value="baseSelect"
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
                <!-- The stylesheet list IS this row's value: one line per file with what it
                     declares, instead of a JSON array that says only the paths. -->
                <ul v-if="d.path === 'assets.css'" class="brand-stylesheets">
                  <li v-for="href in asArray(d.value)" :key="href">
                    <code class="bucket-tag">{{ href.split('/').pop() }}</code>
                    <span
                      v-if="sheetFor(bucket, href)"
                      class="ds-text-soft"
                      :class="{ 'sheet-unreadable': sheetFor(bucket, href).unreadable }"
                    >
                      {{ sheetLabel(sheetFor(bucket, href)) }}
                    </span>
                  </li>
                </ul>
                <span
                  v-else
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
import { BUCKET_NAMES, brandingDefaults, extractBucket } from '@ocelot-social/branding'
import { OsCard } from '@ocelot-social/ui'
import {
  setActiveBrandingMutation,
  setBrandingCompositionMutation,
} from '~/graphql/BrandingMutations'
import { discoverThemeTokens, summarizeStylesheet } from '~/utils/themeTokens.js'

/**
 * Fetches a brand's own stylesheets (config.assets.css, already namespaced to /branding/<id>/…) and
 * reduces each to what it declares. A file that cannot be read is reported as such rather than
 * omitted — silently showing nothing would look like "this stylesheet changes nothing".
 *
 * Every entry carries `customProperties`, readable or not: the summary row reads it unconditionally,
 * and a missing key there is a render-time TypeError that takes the whole admin page down — for the
 * one case (a stylesheet that 404s) where the page is most needed.
 */
const UNREADABLE_SHEET = { unreadable: true, customProperties: {} }

async function summarizeBrandCss(config) {
  const hrefs = (config && config.assets && config.assets.css) || []
  return Promise.all(
    hrefs.map(async (href) => {
      try {
        const res = await fetch(href)
        if (!res.ok) return { href, ...UNREADABLE_SHEET }
        return { href, ...summarizeStylesheet(await res.text()) }
      } catch (error) {
        return { href, ...UNREADABLE_SHEET }
      }
    }),
  )
}

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
      // brand id → what each of its own stylesheets (assets.css) actually declares. Without this the
      // page could only name the file; the rules inside it were invisible.
      stylesheets: {},
      // The brandable theme surface, discovered from the loaded stylesheets in mounted(). Client-only:
      // there is no CSSOM during SSR, and an empty map simply means "no theme rows yet".
      themeTokens: {},
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
      // The base this page was ACTUALLY server-rendered with (window.__NUXT__.brandingId, stamped by
      // plugins/branding.js). Needed because an empty `activeBranding` policy does NOT mean vanilla:
      // the SSR loader then resolves $OCELOT_ACTIVE_BRANDING → the baked DEFAULT marker → vanilla, and
      // neither of the first two is visible to the client. Same reasoning as plugins/branding-subscribe.
      renderedId: '',
    }
  },
  mounted() {
    // Initialise the composition editor from the live policy value (client-only; policy is loaded).
    this.composition = this.readComposition()
    this.renderedId = (window.__NUXT__ && window.__NUXT__.brandingId) || ''
    // Read the framework's own :root defaults off the live stylesheets rather than a table shipped
    // with the branding package — that table was hand-maintained and had fallen far behind.
    this.themeTokens = discoverThemeTokens()
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
    const stylesheets = {}
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
            if (res.ok) {
              details[b.id] = await res.json()
              stylesheets[b.id] = await summarizeBrandCss(details[b.id])
            }
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
    this.stylesheets = stylesheets
    this.schemaVersions = schemaVersions
  },
  computed: {
    // The raw stored value — '' (never chosen) or the vanilla sentinel or a brand id. Only the
    // whole-package select needs it, so its option can round-trip the sentinel.
    activeSelect() {
      return this.$policy.get('activeBranding') || ''
    },
    // The base brand actually IN EFFECT. Three cases, and only the first two come from the policy:
    // the vanilla sentinel is an explicit "framework defaults"; a non-empty value is an explicit brand;
    // an EMPTY value means nothing was ever chosen, and the server then resolved the base itself
    // ($OCELOT_ACTIVE_BRANDING → baked DEFAULT marker → vanilla). Reading '' as vanilla — as this did —
    // put the "active base" badge on the framework-default row and labelled the composition after it,
    // while the deployment was rendering its baked brand. Everything that looks a brand up by id
    // (labels, badges, config preview, which buckets the base provides) uses this.
    activeId() {
      const raw = this.activeSelect
      if (raw === VANILLA_SOURCE) return ''
      return raw || this.renderedId
    },
    // What the whole-package select shows. The unset policy has no option of its own, so it shows the
    // brand that IS rendered; picking that same entry is a no-op (no change event), but switching away
    // and back pins it explicitly — an accepted trade-off for not carrying a fourth select state.
    baseSelect() {
      if (this.activeSelect === VANILLA_SOURCE) return VANILLA_SOURCE
      return this.activeId || VANILLA_SOURCE
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
    // own fixed option (the vanilla sentinel), so including it would render a duplicate entry with the
    // same value.
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
    // The theme's palette is not a config field at all any more — it lives in the brand's stylesheets.
    // Its defaults are the framework's own `:root`, discovered from the loaded CSS in mounted().
    defaultsMap(bucket) {
      const map = {}
      this.flatten(extractBucket(brandingDefaults, bucket)).forEach((r) => {
        map[r.path] = r.value
      })
      if (bucket === 'theme') {
        for (const [key, value] of Object.entries(this.themeTokens)) {
          map[`--${key}`] = value
        }
      }
      return map
    },
    // The summary for a brand stylesheet's row (see summarizeBrandCss). A file that could not be read
    // says so instead of reporting "0 theme properties" — that reads like a successful scan of a
    // stylesheet which happens to declare nothing, which is a different and far less urgent thing.
    // vuex-i18n has no $tc — pluralisation is `$t(key, count)` against a 'singular ::: plural' string,
    // the convention the rest of the locales already use.
    sheetLabel(sheet) {
      if (sheet.unreadable) return this.$t('admin.branding.stylesheetUnreadable')
      const count = Object.keys(sheet.customProperties).length
      return this.$t('admin.branding.stylesheetVars', { count }, count)
    },
    // Every custom property a brand's own stylesheets declare, merged in listing order (a later sheet
    // wins, as in the cascade). The CSS is the only source — the admin reads it rather than a copy
    // the CSS rather than a copy of it in the config.
    asArray(value) {
      return Array.isArray(value) ? value : []
    },
    // The summary for one stylesheet of this bucket's source, matched by its href.
    sheetFor(bucket, href) {
      return this.bucketStylesheets(bucket).find((s) => s.href === href) || null
    },
    // The stylesheets behind a bucket's currently selected source — same slot resolution as its rows.
    bucketStylesheets(bucket) {
      const select = this.effectiveSelect(bucket)
      if (select === VANILLA_SOURCE) return []
      const id = select || this.activeId
      return (id && this.stylesheets[id]) || []
    },
    declaredTokensOf(select) {
      // Resolve the SELECT VALUE the same way configForSelect does — indexing this.stylesheets with it
      // directly silently returned {} for the two non-id cases, which made every token look like the
      // framework default: an empty slot means "inherit from the base", and the vanilla sentinel is
      // not a brand at all.
      if (select === VANILLA_SOURCE) return {}
      const id = select || this.activeId
      const out = {}
      for (const sheet of (id && this.stylesheets[id]) || []) {
        Object.assign(out, sheet.customProperties || {})
      }
      return out
    },
    eqv(a, b) {
      return JSON.stringify(a) === JSON.stringify(b)
    },
    // Flatten a source config's bucket slice; for `theme`, ADD every overridable palette token — the
    // brand's own value where its stylesheets declare one, the framework default otherwise — so all
    // colours are listed even though none of them is a config field.
    bucketRows(select, bucket) {
      const config = this.configForSelect(select)
      const rows = this.flatten(extractBucket(config, bucket))
      if (bucket !== 'theme') return rows
      const declared = this.declaredTokensOf(select)
      const present = new Set(rows.map((r) => r.path))
      for (const key of Object.keys(this.themeTokens)) {
        const path = `--${key}`
        if (present.has(path)) continue
        rows.push({
          path,
          value: declared[key] !== undefined ? declared[key] : this.themeTokens[key],
        })
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

<style scoped>
.composition-bucket {
  border-bottom: 1px solid var(--border-color-softer);

  &:last-child {
    border-bottom: none;
  }
}

.composition-row {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  padding: var(--space-x-small) 0;
}

.composition-row--base {
  /*  The whole-package preset sits above the per-slot rows, set apart with a heavier divider. */
  border-bottom: 2px solid var(--border-color-soft);
  padding-bottom: var(--space-small);
  margin-bottom: var(--space-x-small);
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
  color: var(--text-color-soft);
  padding: 0;
  text-align: center;
  font-size: var(--font-size-small);
}

.composition-label {
  flex: 1;
  font-weight: var(--text-weight-bold);
}

.composition-select {
  /*  Fixed identical width so the base (whole-package) select and every per-bucket select line up, */
  /*  regardless of the selected option's text length. */
  flex: 0 0 auto;
  width: 280px;
  max-width: 100%;
  padding: var(--space-xx-small) var(--space-x-small);
}

.composition-details {
  padding: 0 0 var(--space-small) var(--space-base);
}

.composition-source {
  margin: 0 0 var(--space-x-small);
  color: var(--text-color-soft);
  font-size: var(--font-size-small);
}

.detail-list {
  margin: 0;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  padding: 1px 0;

  dt {
    flex: 0 0 40%;
    color: var(--text-color-soft);
    font-size: var(--font-size-small);
    word-break: break-all;
  }

  dd {
    flex: 1;
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--space-x-small);
    font-size: var(--font-size-small);
  }

  /*  Diff highlighting for a staged (pending) change: changed / added / removed. */
}

.detail-row--changed {
  background-color: color-mix(in srgb, var(--color-warning) 12%, transparent);
}

.detail-row--added {
  background-color: color-mix(in srgb, var(--color-success) 12%, transparent);
}

.detail-row--removed {
  background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
}

.detail-value {
  word-break: break-word;

  /*  A value the source does not actually set (equals the framework default) — greyed out. */
}

.detail-value--removed {
  text-decoration: line-through;
  color: var(--text-color-soft);
}

.detail-value--default {
  color: var(--text-color-softer);
}

.detail-default-tag {
  color: var(--text-color-softer);
  font-size: var(--font-size-x-small);
  font-style: italic;
}

.detail-old {
  color: var(--text-color-soft);
  text-decoration: line-through;
}

.detail-arrow {
  color: var(--text-color-soft);
}

.detail-actions {
  display: flex;
  gap: var(--space-x-small);
  margin-top: var(--space-small);
}

.btn {
  border: none;
  border-radius: var(--border-radius-base);
  padding: 4px 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.btn-confirm {
  background-color: var(--color-primary);
  color: var(--color-primary-inverse);
}

.btn-cancel {
  background-color: var(--background-color-softest);
  color: var(--text-color-base);
}

.detail-empty {
  color: var(--text-color-soft);
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
  border: 1px solid var(--border-color-softer);
  flex: 0 0 auto;

  /*  The old (replaced) colour of a changed row — dimmed to match its struck-through text. */
}

.swatch--old {
  opacity: 0.6;
}

.available-card {
  margin-top: var(--space-base);
}

.available-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.available-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-small);
  padding: var(--space-x-small) 0;
  border-bottom: 1px solid var(--border-color-softer);

  &:last-child {
    border-bottom: none;
  }
}

.available-logo-slot {
  /*  Fixed-width column so the brand names line up regardless of each logo's aspect ratio (and stay */
  /*  aligned for brands without a logo). */
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
  font-weight: var(--text-weight-bold);
}

.available-buckets {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xx-small);
  justify-content: flex-end;
}

.bucket-tag {
  background-color: var(--background-color-softest);
  color: var(--text-color-soft);
  padding: 1px 6px;
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-small);
}

/*  A stylesheet the admin could not fetch is a broken brand, not an empty one — it should not read
    like the neutral "n theme properties" next to it. */
.sheet-unreadable {
  color: var(--color-danger);
}

.branding-version {
  color: var(--text-color-soft);
  font-weight: normal;
}

.branding-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border: 1px solid var(--border-color-softer);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-small);
  font-weight: normal;
  color: var(--text-color-soft);
  vertical-align: middle;
}

.branding-badge-active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.schema-version {
  border: 1px solid var(--border-color-softer);
  border-radius: var(--border-radius-base);
  padding: 0 4px;
  font-size: var(--font-size-small);
}

.hint {
  color: var(--text-color-soft);
}
</style>

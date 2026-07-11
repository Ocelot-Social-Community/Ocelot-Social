<template>
  <div>
    <os-card>
      <h2 class="ds-heading ds-heading-h2">{{ $t('admin.branding.title') }}</h2>
      <p>{{ $t('admin.branding.description') }}</p>

      <ul class="branding-list">
        <!-- The framework default (vanilla) is just the first entry, rendered like any other
             branding from its resolved config (brandingDefaults). -->
        <li
          v-for="entry in entries"
          :key="entry.id || '(default)'"
          class="branding-item"
          :class="{ active: activeId === entry.id }"
        >
          <div class="branding-head">
            <img
              v-if="entry.config.logos && entry.config.logos.headerPath"
              class="branding-logo"
              :src="entry.config.logos.headerPath"
              :alt="entry.label"
            />
            <span class="branding-title">
              {{ entry.label }}
              <code v-if="entry.id">{{ entry.id }}</code>
            </span>
            <span v-if="activeId === entry.id" class="badge badge-active">
              ● {{ $t('admin.branding.current') }}
            </span>
            <!-- No deactivate: switching to the default entry (vanilla) is how you turn a brand off,
                 so the default behaves exactly like any other brand — active or activatable. -->
            <button
              v-else
              class="btn btn-activate"
              :disabled="!!saving"
              @click="switchTo(entry.id)"
            >
              {{ $t('admin.branding.activate') }}
            </button>
          </div>

          <p v-if="entry.config.about && entry.config.about.description" class="branding-desc">
            {{ entry.config.about.description }}
          </p>

          <dl v-if="entry.config.metadata" class="branding-details">
            <div class="detail">
              <dt>{{ $t('admin.branding.detail.organization') }}</dt>
              <dd>
                {{ entry.config.metadata.organizationName }}
                <template v-if="entry.config.metadata.organizationJurisdiction">
                  · {{ entry.config.metadata.organizationJurisdiction }}
                </template>
              </dd>
            </div>
            <div class="detail">
              <dt>{{ $t('admin.branding.detail.appDescription') }}</dt>
              <dd>{{ entry.config.metadata.applicationDescription }}</dd>
            </div>
            <div v-if="entry.config.about" class="detail">
              <dt>{{ $t('admin.branding.detail.reuse') }}</dt>
              <dd>
                {{ $t('admin.branding.detail.logos') }}:
                {{ reusable(entry.config.about.license.logosReusable) }} ·
                {{ $t('admin.branding.detail.colors') }}:
                {{ reusable(entry.config.about.license.colorsReusable) }}
                <template v-if="entry.config.about.license.note">
                  <br />
                  <span class="license-note">{{ entry.config.about.license.note }}</span>
                </template>
              </dd>
            </div>
            <div class="detail">
              <dt>{{ $t('admin.branding.detail.themeColor') }}</dt>
              <dd>
                <span
                  class="swatch"
                  :style="{ backgroundColor: entry.config.metadata.themeColor }"
                />
                <code>{{ entry.config.metadata.themeColor }}</code>
              </dd>
            </div>
            <div v-if="entry.config.links" class="detail">
              <dt>{{ $t('admin.branding.detail.footer') }}</dt>
              <dd>{{ entry.config.links.footerOrder.join(', ') }}</dd>
            </div>
            <div v-if="entry.config.assets" class="detail">
              <dt>{{ $t('admin.branding.detail.pages') }}</dt>
              <dd>{{ pageSummary(entry.config) }}</dd>
            </div>
            <div v-if="entry.config.assets && entry.config.assets.favicon" class="detail">
              <dt>{{ $t('admin.branding.detail.favicon') }}</dt>
              <dd><img class="favicon" :src="entry.config.assets.favicon" alt="favicon" /></dd>
            </div>
          </dl>
        </li>
      </ul>

      <p v-if="$fetchState.pending" class="hint">{{ $t('admin.branding.loading') }}</p>
      <p v-else-if="!brandings.length" class="hint">{{ $t('admin.branding.noneExtra') }}</p>
    </os-card>
  </div>
</template>

<script>
import { brandingDefaults } from '@ocelot-social/branding'
import { OsCard } from '@ocelot-social/ui'
import { setActiveBrandingMutation } from '~/graphql/BrandingMutations'

export default {
  components: { OsCard },
  middleware: ['isAdmin'],
  // The list of baked-in brandings is a served asset (the branding-assets middleware writes
  // /branding/manifest.json), not a backend query — fetch it client-side, plus each brand's
  // resolved config (branding.json) for the detail view.
  fetchOnServer: false,
  data() {
    return {
      brandings: [],
      details: {},
      saving: null,
    }
  },
  async fetch() {
    let list = []
    try {
      const res = await fetch('/branding/manifest.json')
      list = res.ok ? await res.json() : []
    } catch (error) {
      list = []
    }
    const details = {}
    await Promise.all(
      list.map(async (b) => {
        try {
          const res = await fetch(b.config)
          if (res.ok) details[b.id] = await res.json()
        } catch (error) {
          // detail view degrades gracefully when a config can't be loaded
        }
      }),
    )
    this.brandings = list
    this.details = details
  },
  computed: {
    // The live active branding id ('' = framework default). Kept live by the policy subscription.
    activeId() {
      return this.$policy.get('activeBranding') || ''
    },
    // The default brand is the first entry and behaves like any other: its resolved config is the
    // framework defaults (brandingDefaults). Baked brandings follow, each with its fetched config.
    entries() {
      return [
        { id: '', label: this.$t('admin.branding.vanilla'), config: brandingDefaults },
        ...this.brandings.map((b) => ({
          id: b.id,
          label: b.label || b.id,
          config: this.details[b.id] || {},
        })),
      ]
    },
  },
  methods: {
    reusable(value) {
      return value ? '✓' : '✗'
    },
    pageSummary(config) {
      const html = (config.assets && config.assets.html) || {}
      const pages = Object.keys(html)
      const locales = new Set()
      for (const page of pages) Object.keys(html[page] || {}).forEach((l) => locales.add(l))
      if (!pages.length) return this.$t('admin.branding.detail.noPages')
      return this.$t('admin.branding.detail.pagesSummary', {
        pages: pages.length,
        locales: [...locales].join(', '),
      })
    },
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
}

.branding-item {
  // Left padding is a gutter for the active marker, applied to EVERY item so they all align and
  // the content never sits under the green bar.
  padding: $space-small 0 $space-small $space-small;
  border-bottom: 1px solid $border-color-softer;

  &.active {
    // inset shadow marks the active item without taking layout space (no per-item indent).
    box-shadow: inset 3px 0 0 $color-success;
  }
}

.branding-head {
  display: flex;
  align-items: center;
  gap: $space-small;
}

.branding-logo {
  height: 24px;
  width: auto;
}

.branding-title {
  flex: 1;
  font-weight: $font-weight-bold;
}

.badge-active {
  color: $color-success;
  font-weight: $font-weight-bold;
}

.btn {
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
  cursor: pointer;
  color: $color-primary-inverse;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.btn-activate {
  background-color: $color-success;
}

.branding-desc {
  margin: 4px 0 0;
  color: $text-color-soft;
}

.license-note {
  font-style: italic;
}

.branding-details {
  margin: $space-small 0 0;

  .detail {
    display: flex;
    gap: $space-small;
    padding: 2px 0;

    dt {
      flex: 0 0 30%;
      color: $text-color-soft;
    }

    dd {
      flex: 1;
      margin: 0;
    }
  }
}

.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid $border-color-softer;
  vertical-align: middle;
  margin-right: 4px;
}

.favicon {
  height: 16px;
  width: 16px;
}

.hint {
  color: $text-color-soft;
}
</style>

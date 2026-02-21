<template>
  <client-only>
    <div
      class="layout-toggle"
      :class="{ 'layout-toggle--hidden': isMobile }"
      role="radiogroup"
      :aria-label="$t('layout.toggle.label')"
    >
      <os-button
        circle
        size="sm"
        :appearance="value ? 'filled' : 'ghost'"
        variant="primary"
        role="radio"
        :aria-checked="String(value)"
        :aria-label="$t('layout.toggle.singleColumn')"
        @click="setLayout(true)"
      >
        <template #icon>
          <os-icon :icon="icons.list" />
        </template>
      </os-button>
      <os-button
        circle
        size="sm"
        :appearance="!value ? 'filled' : 'ghost'"
        variant="primary"
        role="radio"
        :aria-checked="String(!value)"
        :aria-label="$t('layout.toggle.multiColumn')"
        @click="setLayout(false)"
      >
        <template #icon>
          <os-icon :icon="icons.columns" />
        </template>
      </os-button>
    </div>
  </client-only>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import mobile from '~/mixins/mobile'

const STORAGE_KEY = 'ocelot-layout-single-column'

export default {
  components: {
    OsButton,
    OsIcon,
  },
  mixins: [mobile()],
  props: {
    value: {
      type: Boolean,
      default: false,
    },
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        this.$emit('input', stored === 'true')
      }
    } catch (e) {
      // localStorage not available
    }
  },
  methods: {
    setLayout(val) {
      try {
        localStorage.setItem(STORAGE_KEY, String(val))
      } catch (e) {
        // localStorage not available
      }
      this.$emit('input', val)
    },
  },
}
</script>

<style lang="scss">
.layout-toggle {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  transition: opacity 0.3s ease;
}

.layout-toggle--hidden {
  opacity: 0;
  pointer-events: none;
}
</style>

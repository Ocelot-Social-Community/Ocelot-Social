<template>
  <client-only>
    <div
      class="layout-toggle"
      :class="{ 'layout-toggle--hidden': isMobile }"
      role="radiogroup"
      :aria-label="$t('layout.toggle.label')"
      @keydown.left.prevent="setLayout(true)"
      @keydown.right.prevent="setLayout(false)"
    >
      <os-button
        ref="singleBtn"
        circle
        size="sm"
        :appearance="value ? 'filled' : 'ghost'"
        variant="primary"
        role="radio"
        :aria-checked="String(value)"
        :aria-label="$t('layout.toggle.singleColumn')"
        :tabindex="value ? '0' : '-1'"
        @click="setLayout(true)"
      >
        <template #icon>
          <os-icon :icon="icons.list" />
        </template>
      </os-button>
      <os-button
        ref="multiBtn"
        circle
        size="sm"
        :appearance="!value ? 'filled' : 'ghost'"
        variant="primary"
        role="radio"
        :aria-checked="String(!value)"
        :aria-label="$t('layout.toggle.multiColumn')"
        :tabindex="!value ? '0' : '-1'"
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
  mixins: [mobile(639)],
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
      this.$nextTick(() => {
        const ref = val ? this.$refs.singleBtn : this.$refs.multiBtn
        const el = ref?.$el || ref
        if (el) el.focus()
      })
    },
  },
}
</script>

<style lang="scss">
.layout-toggle {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.layout-toggle--hidden {
  display: none;
}
</style>

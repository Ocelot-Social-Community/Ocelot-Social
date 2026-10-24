<template>
  <span class="theme-switch-wrap">
    <os-button
      class="theme-switch"
      data-test="theme-switch"
      variant="primary"
      appearance="ghost"
      circle
      :aria-label="label"
      v-tooltip="{ content: label, placement: 'bottom-start' }"
      @click.prevent="next"
    >
      <template #icon>
        <os-icon v-if="iconStyle.svg" :icon="icon" />
        <span v-else class="theme-switch__glyph" aria-hidden="true">{{ glyph }}</span>
      </template>
    </os-button>
    <!-- TRIAL ONLY: swaps glyphs ↔ SVG icons for comparing; remove once decided. -->
    <button class="theme-switch__trial" data-test="theme-icon-trial" @click.prevent="toggleIcons">
      ⇄
    </button>
  </span>
</template>

<script>
import Vue from 'vue'
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { THEME_COOKIE, THEMES, applyTheme, normalizeTheme } from '~/utils/theme'

const GLYPHS = { system: '◐', light: '☀', dark: '☾' }
const ICONS = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' }
// TRIAL ONLY — shared by the desktop and the mobile instance, remembered in localStorage.
const TRIAL_KEY = 'ocelot-theme-icons'
const iconStyle = Vue.observable({ svg: false })

export default {
  name: 'ThemeSwitch',
  components: { OsButton, OsIcon },
  data() {
    return { theme: normalizeTheme(this.$cookies && this.$cookies.get(THEME_COOKIE)), iconStyle }
  },
  mounted() {
    iconStyle.svg = window.localStorage.getItem(TRIAL_KEY) === 'svg'
  },
  computed: {
    icon() {
      return iconRegistry[ICONS[this.theme]]
    },
    glyph() {
      return GLYPHS[this.theme]
    },
    label() {
      // Spelled out so the i18n lint sees every key in use.
      const labels = {
        system: this.$t('themeSwitch.system'),
        light: this.$t('themeSwitch.light'),
        dark: this.$t('themeSwitch.dark'),
      }
      return labels[this.theme]
    },
  },
  methods: {
    toggleIcons() {
      iconStyle.svg = !iconStyle.svg
      window.localStorage.setItem(TRIAL_KEY, iconStyle.svg ? 'svg' : 'glyph')
    },
    // system → light → dark → system
    next() {
      this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]
      this.$cookies.set(THEME_COOKIE, this.theme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
      applyTheme(this.theme)
    },
  },
}
</script>

<style scoped>
.theme-switch-wrap {
  display: inline-flex;
  align-items: center;
}
.theme-switch__trial {
  border: 0;
  background: none;
  color: var(--text-color-soft);
  cursor: pointer;
  font-size: 0.8em;
  padding: 0 2px;
}
.theme-switch__glyph {
  font-size: 1.15em;
  line-height: 1;
}
</style>

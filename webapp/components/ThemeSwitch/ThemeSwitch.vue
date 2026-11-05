<template>
  <!-- The mobile menu's row: icon, the current theme in words, the whole row a button — like its
       neighbours (HeaderMenu .mobile-nav-item). -->
  <div
    v-if="row"
    class="theme-switch theme-switch--row mobile-nav-item"
    data-test="theme-switch"
    role="button"
    tabindex="0"
    @click.prevent="next"
    @keydown.enter.prevent="next"
    @keydown.space.prevent="next"
  >
    <os-button
      variant="primary"
      appearance="ghost"
      circle
      tabindex="-1"
      aria-hidden="true"
      class="mobile-nav-icon-button mobile-icon-col"
    >
      <template #icon>
        <os-icon :icon="icon" />
      </template>
    </os-button>
    <span>{{ label }}</span>
  </div>
  <os-button
    v-else
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
      <os-icon :icon="icon" />
    </template>
  </os-button>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { THEME_COOKIE, THEMES, applyTheme, normalizeTheme } from '~/utils/theme'

const ICONS = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' }

export default {
  name: 'ThemeSwitch',
  components: { OsButton, OsIcon },
  props: {
    // A menu row with the theme in words, instead of the round icon button.
    row: { type: Boolean, default: false },
  },
  data() {
    return { theme: normalizeTheme(this.$cookies && this.$cookies.get(THEME_COOKIE)) }
  },
  computed: {
    icon() {
      return iconRegistry[ICONS[this.theme]]
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

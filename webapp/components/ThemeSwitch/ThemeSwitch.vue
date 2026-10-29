<template>
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

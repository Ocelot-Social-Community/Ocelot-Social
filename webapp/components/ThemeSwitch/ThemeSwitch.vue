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
      <span class="theme-switch__glyph" aria-hidden="true">{{ glyph }}</span>
    </template>
  </os-button>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { THEME_COOKIE, THEMES, applyTheme, normalizeTheme } from '~/utils/theme'

const GLYPHS = { system: '◐', light: '☀', dark: '☾' }

export default {
  name: 'ThemeSwitch',
  components: { OsButton },
  data() {
    return { theme: normalizeTheme(this.$cookies && this.$cookies.get(THEME_COOKIE)) }
  },
  computed: {
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
.theme-switch__glyph {
  font-size: 1.15em;
  line-height: 1;
}
</style>

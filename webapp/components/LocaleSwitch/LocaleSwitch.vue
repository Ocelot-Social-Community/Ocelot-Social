<template>
  <client-only>
    <dropdown ref="menu" :placement="placement" :offset="offset">
      <template #default="{ toggleMenu }">
        <os-button
          class="locale-menu"
          variant="primary"
          appearance="ghost"
          circle
          :aria-label="$t('localeSwitch.tooltip')"
          v-tooltip="{
            content: $t('localeSwitch.tooltip'),
            placement: 'bottom-start',
          }"
          @click.prevent="toggleMenu()"
        >
          <template #icon>
            <os-icon :icon="icons.language" />
          </template>
        </os-button>
      </template>
      <template #popover="{ toggleMenu }">
        <ds-menu class="locale-menu-popover" :matcher="matcher" :routes="routes">
          <template #menuitem="item">
            <ds-menu-item
              class="locale-menu-item"
              :route="item.route"
              :parents="item.parents"
              @click.stop.prevent="changeLanguage(item.route.path, toggleMenu)"
            >
              {{ item.route.name }}
            </ds-menu-item>
          </template>
        </ds-menu>
      </template>
    </dropdown>
  </client-only>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'
import find from 'lodash/find'
import orderBy from 'lodash/orderBy'
import locales from '~/locales'
import localeUpdate from '~/mixins/localeUpdate.js'

export default {
  mixins: [localeUpdate],
  components: {
    Dropdown,
    OsButton,
    OsIcon,
  },
  props: {
    placement: { type: String, default: 'bottom-start' },
    offset: { type: [String, Number], default: '16' },
  },
  data() {
    return {
      locales: orderBy(locales, 'name'),
    }
  },
  computed: {
    current() {
      return find(this.locales, { code: this.$i18n.locale() })
    },
    routes() {
      return this.locales.map((locale) => ({
        name: locale.name,
        path: locale.code,
        flag: locale.flag,
      }))
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    changeLanguage(locale, toggleMenu) {
      this.$i18n.set(locale)
      this.updateUserLocale()
      toggleMenu()
    },
    matcher(locale) {
      return locale === this.$i18n.locale()
    },
  },
}
</script>

<style lang="scss">
nav.locale-menu-popover {
  margin-left: -$space-small !important;
  margin-right: -$space-small !important;

  a {
    padding: $space-x-small $space-small;
    padding-right: $space-base;
  }
}

.locale-flag {
  margin-right: $space-xx-small;
  font-size: 1.2em;
  line-height: 1;
}
</style>

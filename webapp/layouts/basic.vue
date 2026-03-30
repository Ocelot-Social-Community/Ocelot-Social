<template>
  <div class="layout-blank">
    <div class="main-navigation">
      <div
        class="ds-container ds-container-x-large main-navigation-container"
        style="padding: 10px 10px"
      >
        <div class="ds-flex ds-flex-centered main-navigation-flex">
          <div style="flex: 0 0 5.5%; width: 5.5%"></div>
          <div style="flex: 0 0 20%; width: 20%; flex-grow: 1">
            <a @click="redirectToRoot">
              <logo logoType="header" />
            </a>
          </div>
          <div style="flex: 0 0 20%; width: 20%; flex-grow: 0">
            <div class="main-navigation-right" style="flex-basis: auto">
              <locale-switch class="topbar-locale-switch" placement="top" offset="8" />
              <template v-if="!isLoggedIn">
                <client-only>
                  <dropdown class="login-button" offset="8" placement="top">
                    <template #default="{ toggleMenu }">
                      <os-button
                        data-test="login-btn"
                        variant="primary"
                        appearance="ghost"
                        circle
                        :aria-label="$t('login.login')"
                        @click.prevent="toggleMenu"
                      >
                        <template #icon>
                          <os-icon :icon="icons.signIn" />
                        </template>
                      </os-button>
                    </template>
                    <template #popover>
                      <div class="login-button-menu-popover">
                        <nuxt-link class="login-link" :to="{ name: 'login' }">
                          <os-icon :icon="icons.signIn" />
                          {{ $t('login.login') }}
                        </nuxt-link>
                      </div>
                    </template>
                  </dropdown>
                </client-only>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ds-container ds-container-x-large">
      <div class="content">
        <nuxt />
      </div>
    </div>
    <page-footer></page-footer>
    <div id="overlay" />
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import seo from '~/mixins/seo'
import Logo from '~/components/Logo/Logo'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Dropdown from '~/components/Dropdown'
import PageFooter from '~/components/PageFooter/PageFooter'

export default {
  components: {
    OsButton,
    OsIcon,
    Logo,
    LocaleSwitch,
    Dropdown,
    PageFooter,
  },
  mixins: [seo],
  created() {
    this.icons = iconRegistry
  },
  computed: {
    ...mapGetters({
      isLoggedIn: 'auth/isLoggedIn',
    }),
  },
  methods: {
    redirectToRoot() {
      this.$router.replace('/')
    },
  },
}
</script>

<style lang="scss" scoped>
.main-navigation-right {
  display: flex;
  justify-content: flex-end;
}
.main-navigation-right .desktop-view {
  float: right;
}

.layout-blank .content {
  padding: 5rem 2rem;
}
@media only screen and (max-width: 500px) {
  .layout-blank .content {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}

.login-button {
  color: $color-secondary;
}

.login-button-menu-popover {
  padding-top: $space-x-small;
  padding-bottom: $space-x-small;

  .login-link {
    color: $text-color-link;
    padding-top: $space-xx-small;
    &:hover {
      color: $text-color-link-active;
    }
  }
}
</style>

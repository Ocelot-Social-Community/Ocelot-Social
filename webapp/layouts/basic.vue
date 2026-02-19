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
                  <login-button placement="top" />
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
import { mapGetters } from 'vuex'
import seo from '~/mixins/seo'
import Logo from '~/components/Logo/Logo'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import LoginButton from '~/components/LoginButton/LoginButton'
import PageFooter from '~/components/PageFooter/PageFooter'

export default {
  components: {
    Logo,
    LocaleSwitch,
    LoginButton,
    PageFooter,
  },
  mixins: [seo],
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
</style>

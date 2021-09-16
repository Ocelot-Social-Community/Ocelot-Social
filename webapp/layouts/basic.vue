<template>
  <div class="layout-blank">
    <div class="main-navigation">
      <ds-container width="x-large" class="main-navigation-container" style="padding: 10px 10px">
        <ds-flex class="main-navigation-flex" centered>
          <ds-flex-item width="5.5%" />
          <ds-flex-item style="flex-grow: 1" width="20%">
            <a @click="redirectToRoot">
              <logo logoType="header" />
            </a>
          </ds-flex-item>
          <ds-flex-item width="20%" style="flex-grow: 0">
            <div class="main-navigation-right" style="flex-basis: auto">
              <locale-switch class="topbar-locale-switch" placement="top" offset="8" />
              <template v-if="!isLoggedIn">
                <client-only>
                  <login-button placement="top" />
                </client-only>
              </template>
            </div>
          </ds-flex-item>
        </ds-flex>
      </ds-container>
    </div>
    <ds-container>
      <div style="padding: 5rem 2rem">
        <nuxt />
      </div>
    </ds-container>
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

<style lang="scss">
.main-navigation-right {
  display: flex;
  justify-content: flex-end;
}
.main-navigation-right .desktop-view {
  float: right;
}
</style>

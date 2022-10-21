<template>
  <div class="layout-default">
    <div class="main-navigation">
      <ds-container class="main-navigation-container" style="padding: 10px 10px">
        <div>
          <ds-flex class="main-navigation-flex">
            <ds-flex-item :width="{ base: LOGOS.LOGO_HEADER_WIDTH }" style="margin-right: 20px">
              <a
                v-if="LOGOS.LOGO_HEADER_CLICK.externalLink"
                :href="LOGOS.LOGO_HEADER_CLICK.externalLink"
              >
                <logo logoType="header" />
              </a>
              <nuxt-link
                v-else
                :to="LOGOS.LOGO_HEADER_CLICK.internalPath.to"
                v-scroll-to="LOGOS.LOGO_HEADER_CLICK.internalPath.scrollTo"
              >
                <logo logoType="header" />
              </nuxt-link>
            </ds-flex-item>

            <ds-flex-item
              v-for="item in menu"
              :key="item.name"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              :width="{ base: 'auto' }"
              style="margin-right: 20px"
            >
              <a v-if="item.url" :href="item.url" target="_blank">
                <ds-text size="large" bold>
                  {{ $t(item.nameIdent) }}
                </ds-text>
              </a>
              <nuxt-link v-else :to="item.path">
                <ds-text size="large" bold>
                  {{ $t(item.nameIdent) }}
                </ds-text>
              </nuxt-link>
            </ds-flex-item>
            <ds-flex-item
              :width="{ base: '40%', sm: '40%', md: '40%', lg: '0%' }"
              class="mobile-hamburger-menu"
            >
              <base-button icon="bars" @click="toggleMobileMenuView" circle />
            </ds-flex-item>
            <ds-flex-item
              :width="{
                base: '45%',
                sm: '45%',
                md: isHeaderMenu ? 'auto' : '45%',
                lg: isHeaderMenu ? 'auto' : '50%',
              }"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              style="flex-shrink: 0; flex-grow: 1"
              id="nav-search-box"
              v-if="isLoggedIn"
            >
              <search-field />
            </ds-flex-item>
            <ds-flex-item
              v-if="isLoggedIn"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              style="flex-grow: 0; flex-basis: auto"
            >
              <client-only>
                <filter-menu v-show="showFilterMenuDropdown" />
              </client-only>
            </ds-flex-item>
            <ds-flex-item
              style="flex-basis: auto"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            >
              <div
                class="main-navigation-right"
                :class="{
                  'desktop-view': !toggleMobileMenu,
                  'hide-mobile-menu': !toggleMobileMenu,
                }"
                style="flex-basis: auto"
              >
                <locale-switch class="topbar-locale-switch" placement="top" offset="8" />
                <template v-if="isLoggedIn">
                  <client-only>
                    <notification-menu placement="top" />
                  </client-only>
                  <div v-if="inviteRegistration">
                    <client-only>
                      <invite-button placement="top" />
                    </client-only>
                  </div>
                  <client-only v-if="SHOW_GROUP_BUTTON_IN_HEADER">
                    <group-button />
                  </client-only>
                  <client-only>
                    <avatar-menu placement="top" />
                  </client-only>
                </template>
              </div>
            </ds-flex-item>
          </ds-flex>
        </div>
      </ds-container>
    </div>
    <ds-container>
      <div class="main-container">
        <nuxt />
      </div>
    </ds-container>
    <page-footer />
    <div id="overlay" />
    <client-only>
      <modal />
    </client-only>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { SHOW_GROUP_BUTTON_IN_HEADER } from '~/constants/groups.js'
import LOGOS from '../constants/logos.js'
import headerMenu from '../constants/headerMenu.js'
import seo from '~/mixins/seo'
import AvatarMenu from '~/components/AvatarMenu/AvatarMenu'
import FilterMenu from '~/components/FilterMenu/FilterMenu.vue'
import InviteButton from '~/components/InviteButton/InviteButton'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Logo from '~/components/Logo/Logo'
import SearchField from '~/components/features/SearchField/SearchField.vue'
import Modal from '~/components/Modal'
import GroupButton from '~/components/Group/GroupButton'
import NotificationMenu from '~/components/NotificationMenu/NotificationMenu'
import PageFooter from '~/components/PageFooter/PageFooter'

export default {
  components: {
    AvatarMenu,
    FilterMenu,
    InviteButton,
    LocaleSwitch,
    Logo,
    Modal,
    NotificationMenu,
    PageFooter,
    GroupButton,
    SearchField,
  },
  mixins: [seo],
  data() {
    return {
      LOGOS,
      SHOW_GROUP_BUTTON_IN_HEADER,
      isHeaderMenu: headerMenu.MENU.length > 0,
      menu: headerMenu.MENU,
      mobileSearchVisible: false,
      toggleMobileMenu: false,
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling,
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
    }
  },
  computed: {
    ...mapGetters({
      isLoggedIn: 'auth/isLoggedIn',
    }),
    showFilterMenuDropdown() {
      const [firstRoute] = this.$route.matched
      return firstRoute && firstRoute.name === 'index'
    },
  },
  methods: {
    toggleMobileMenuView() {
      this.toggleMobileMenu = !this.toggleMobileMenu
    },
  },
}
</script>

<style lang="scss">
.main-navigation {
  background-color: $color-header-background;
}
.margin-right-20 {
  margin-right: 20px;
}
.margin-x {
  margin-left: 20px;
  margin-right: 20px;
  white-space: nowrap;
}
.topbar-locale-switch {
  display: flex;
  margin-right: $space-xx-small;
  align-self: center;
  display: inline-flex;
}
.main-container {
  padding-top: 6rem;
  padding-bottom: 5rem;
}

.main-navigation-flex {
  align-items: center;
}

.main-navigation-right {
  display: flex;
  justify-content: flex-end;
}
.main-navigation-right .desktop-view {
  float: right;
}
.ds-flex-item.mobile-hamburger-menu {
  margin-left: auto;
  text-align: right;
}
@media only screen and (min-width: 730px) {
  .mobile-hamburger-menu {
    display: none;
  }
}
@media only screen and (max-width: 730px) {
  #nav-search-box,
  .main-navigation-right {
    margin: 10px 0px;
  }
  .hide-mobile-menu {
    display: none;
  }
}
</style>

<template>
  <div class="layout-default">
    <div class="main-navigation">
      <ds-container class="main-navigation-container" style="padding: 10px 10px">
        <div>
          <!-- header menu -->
          <ds-flex v-if="!showMobileMenu" class="main-navigation-flex">
            <!-- logo -->
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
            <!-- dynamic-brand-menu -->
            <ds-flex-item
              v-for="item in menu"
              :key="item.name"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              class="branding-menu"
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

            <!-- search-field -->
            <ds-flex-item
              v-if="isLoggedIn"
              id="nav-search-box"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              class="header-search"
              :width="{
                base: '45%',
                sm: '40%',
                md: isHeaderMenu ? 'auto' : '40%',
                lg: isHeaderMenu ? 'auto' : '50%',
              }"
              style="flex-shrink: 0; flex-grow: 1"
            >
              <search-field />
            </ds-flex-item>
            <!-- filter-menu 
                TODO: Filter is only visible on index    
            -->
            <ds-flex-item
              v-if="isLoggedIn"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              style="flex-grow: 0; flex-basis: auto"
            >
              <client-only>
                <filter-menu v-show="showFilterMenuDropdown" />
              </client-only>
            </ds-flex-item>
            <!-- locale-switch -->
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
                    <!-- notification-menu -->
                    <notification-menu placement="top" />
                  </client-only>
                  <div v-if="inviteRegistration">
                    <client-only>
                      <!-- invite-button -->
                      <invite-button placement="top" />
                    </client-only>
                  </div>
                  <!-- group button -->
                  <client-only v-if="SHOW_GROUP_BUTTON_IN_HEADER">
                    <group-button />
                  </client-only>
                  <client-only>
                    <!-- avatar-menu -->
                    <avatar-menu placement="top" />
                  </client-only>
                </template>
              </div>
            </ds-flex-item>
          </ds-flex>

          <!-- mobile header menu -->
          <div v-else>
            <!-- logo, hamburger-->
            <ds-flex>
              <ds-flex-item :width="{ base: LOGOS.LOGO_HEADER_WIDTH }" style="margin-right: 20px">
                <nuxt-link :to="{ name: 'index' }" v-scroll-to="'.main-navigation'">
                  <logo logoType="header" />
                </nuxt-link>
              </ds-flex-item>

              <!-- hamburger button -->
              <ds-flex-item class="mobile-hamburger-menu">
                <client-only>
                  <div style="display: inline-flex; padding-right: 20px">
                    <notification-menu />
                  </div>
                </client-only>
                <base-button icon="bars" @click="toggleMobileMenuView" circle />
              </ds-flex-item>
            </ds-flex>
            <!-- search, filter-->
            <ds-flex class="mobile-menu">
              <!-- search-field mobile-->
              <ds-flex-item
                v-if="isLoggedIn"
                :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
                style="padding: 20px"
              >
                <search-field />
              </ds-flex-item>
              <!-- filter menu mobile-->
              <ds-flex-item
                v-if="isLoggedIn"
                :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
                style="flex-grow: 0; flex-basis: auto; padding: 20px 0"
              >
                <client-only>
                  <filter-menu v-show="showFilterMenuDropdown" />
                </client-only>
              </ds-flex-item>
            </ds-flex>
            <!-- switch language, notification, invite, profil -->
            <ds-flex style="margin: 0 20px">
              <!-- locale-switch mobile-->
              <ds-flex-item :class="{ 'hide-mobile-menu': !toggleMobileMenu }">
                <locale-switch class="topbar-locale-switch" placement="top" offset="8" />
              </ds-flex-item>
              <!-- invite-button mobile-->
              <ds-flex-item
                :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
                style="text-align: center"
              >
                <client-only>
                  <invite-button placement="top" />
                </client-only>
              </ds-flex-item>
              <!-- group button mobile -->
              <ds-flex-item
                v-if="SHOW_GROUP_BUTTON_IN_HEADER"
                :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
                style="text-align: center"
              >
                <client-only>
                  <group-button />
                </client-only>
              </ds-flex-item>
              <ds-flex-item
                :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
                style="text-align: end"
              >
                <client-only>
                  <!-- avatar-menu mobile-->
                  <avatar-menu placement="top" />
                </client-only>
              </ds-flex-item>
            </ds-flex>
            <div
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              class="mobile-menu footer-mobile"
            >
              <!-- dynamic branding menu  -->
              <ul v-if="isHeaderMenu" class="dynamic-branding-mobil">
                <li v-for="item in menu" :key="item.name">
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
                </li>
              </ul>
              <hr />
              <!-- dynamic footer menu in header  -->
              <ul class="dynamic-footer-mobil">
                <li v-for="pageParams in links.FOOTER_LINK_LIST" :key="pageParams.name">
                  <page-params-link :pageParams="pageParams">
                    {{ $t(pageParams.internalPage.footerIdent) }}
                  </page-params-link>
                </li>
              </ul>
            </div>
          </div>
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
import links from '~/constants/links.js'
import LOGOS from '../constants/logos.js'
import headerMenu from '../constants/headerMenu.js'
import seo from '~/mixins/seo'
import AvatarMenu from '~/components/AvatarMenu/AvatarMenu'
import FilterMenu from '~/components/FilterMenu/FilterMenu.vue'
import GroupButton from '~/components/Group/GroupButton'
import InviteButton from '~/components/InviteButton/InviteButton'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Logo from '~/components/Logo/Logo'
import SearchField from '~/components/features/SearchField/SearchField.vue'
import Modal from '~/components/Modal'
import NotificationMenu from '~/components/NotificationMenu/NotificationMenu'
import PageFooter from '~/components/PageFooter/PageFooter'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'

export default {
  components: {
    AvatarMenu,
    FilterMenu,
    GroupButton,
    InviteButton,
    LocaleSwitch,
    Logo,
    Modal,
    NotificationMenu,
    PageFooter,
    PageParamsLink,
    SearchField,
  },
  mixins: [seo],
  data() {
    return {
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling,
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      links,
      LOGOS,
      SHOW_GROUP_BUTTON_IN_HEADER,
      isHeaderMenu: headerMenu.MENU.length > 0,
      menu: headerMenu.MENU,
      mobileSearchVisible: false,
      windowWidth: null,
      toggleMobileMenu: false,
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
    showMobileMenu() {
      if (!this.windowWidth) return false
      return this.windowWidth < 810
    },
  },
  methods: {
    toggleMobileMenuView() {
      this.toggleMobileMenu = !this.toggleMobileMenu
    },
  },
  mounted() {
    this.windowWidth = window.innerWidth
    window.addEventListener('resize', () => {
      this.windowWidth = window.innerWidth
    })
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

.mobile-menu {
  margin: 0 20px;
}
.mobile-search {
  margin-top: 20px;
}

.dynamic-branding-mobil,
.dynamic-footer-mobil {
  line-height: 30px;
  font-size: large;
}
.dynamic-branding-mobil li {
  margin: 17px 0;
}

@media only screen and (max-width: 810px) {
  #nav-search-box,
  .main-navigation-right {
    margin: 10px 0px;
  }
  .main-navigation-right {
    width: 100%;
  }
  .hide-mobile-menu {
    display: none;
  }
}
@media only screen and (min-width: 810px) {
  .main-navigation-right {
    width: 100%;
  }
}
</style>

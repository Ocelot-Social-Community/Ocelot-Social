<template>
  <div class="layout-default">
    <div class="main-navigation">
      <ds-container class="main-navigation-container" style="padding: 10px 10px">
        <div>
          <ds-flex class="main-navigation-flex">
             <!-- logo -->
            <ds-flex-item :width="{ base: LOGOS.LOGO_HEADER_WIDTH }" style="margin-right: 20px">
              <nuxt-link :to="{ name: 'index' }" v-scroll-to="'.main-navigation'">
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
            <!-- categories-menu -->
            <ds-flex-item
              v-if="categoriesActive && isLoggedIn"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              class="branding-menu"
              style="flex-grow: 0; flex-basis: auto; margin-right: 20px"
            >
              <client-only>
                <categories-menu></categories-menu>
              </client-only>
            </ds-flex-item>
             <!-- hamburger-menu -->
            <ds-flex-item
              :width="{ base: '20%', sm: '40%', md: '40%', lg: '0%' }"
              class="mobile-hamburger-menu"
            >
              <base-button icon="bars" @click="toggleMobileMenuView" circle />
            </ds-flex-item>
            <!-- search-field -->
            <ds-flex-item
              v-if="isLoggedIn"
              id="nav-search-box"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
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
             <!-- filter-menu -->
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
                  <client-only>
                    <!-- avatar-menu -->
                    <avatar-menu placement="top" />
                  </client-only>
                </template>
              </div>
            </ds-flex-item>
            
          </ds-flex>
          <!-- avatar-menu -->
          <ds-flex>
            <!-- Footer menu if mobile -->
          <ds-flex-item
              style="flex-basis: auto"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu}"
              class="footer-mobile"
            >
            <!-- dynamic branding menu  -->
            <ul v-if="isHeaderMenu" >
              <li
                v-for="item in menu" :key="item.name"
              >
              {{item}}
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
            <!-- dynamic branding menu Categories / Topic  -->
            <ul>
              <li 
              v-if="categoriesActive && isLoggedIn"
              :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
              style="flex-grow: 0; flex-basis: auto; margin-right: 20px"
            >
              <client-only>
                <categories-menu></categories-menu>
              </client-only>
           
              </li>
            </ul>
            <hr />
            <!-- dynamic footer menu in header  -->
              <ul>
                <li v-for="pageParams in links.FOOTER_LINK_LIST" :key="pageParams.name">
                  <page-params-link :pageParams="pageParams">
                    {{ $t(pageParams.internalPage.footerIdent) }}
                  </page-params-link>
                </li>
              </ul>
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
import Logo from '~/components/Logo/Logo'
import LOGOS from '../constants/logos.js'
import headerMenu from '../constants/headerMenu.js'
import { mapGetters } from 'vuex'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import SearchField from '~/components/features/SearchField/SearchField.vue'
import Modal from '~/components/Modal'
import NotificationMenu from '~/components/NotificationMenu/NotificationMenu'
import seo from '~/mixins/seo'
import FilterMenu from '~/components/FilterMenu/FilterMenu.vue'
import PageFooter from '~/components/PageFooter/PageFooter'
import AvatarMenu from '~/components/AvatarMenu/AvatarMenu'
import InviteButton from '~/components/InviteButton/InviteButton'
import CategoriesMenu from '~/components/FilterMenu/CategoriesMenu.vue'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'


export default {
  components: {
    Logo,
    LocaleSwitch,
    SearchField,
    Modal,
    NotificationMenu,
    AvatarMenu,
    FilterMenu,
    PageFooter,
    InviteButton,
    CategoriesMenu,
    PageParamsLink,
  },
  mixins: [seo],
  data() {
    return {
      links,
      LOGOS,
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

.footer-mobile ul {
  margin-left: 20px;
  line-height: 30px;
  font-size: large;
}
 
@media only screen and (max-width: 730px) {
  #nav-search-box,
  .main-navigation-right {
    margin: 10px 0px;
  }
  .main-navigation-right {
    width: 100%;
  }
  .branding-menu,
  .hide-mobile-menu {
    display: none;
  }
}
@media only screen and (min-width: 730px) {
  .footer-mobile,
  .mobile-hamburger-menu {
    display: none;
  }
 .main-navigation-right {
   width: 100%;
 }
 
}
</style>

<template>
  <ds-container
    class="main-navigation-container"
    :class="{ 'hide-navbar': hideNavbar }"
    id="navbar"
  >
    <div>
      <!-- header menu -->
      <ds-flex v-if="!showMobileMenu" class="main-navigation-flex">
        <!-- logo -->
        <ds-flex-item class="logo-wrapper" :width="{ base: 'auto' }">
          <a
            v-if="LOGOS.LOGO_HEADER_CLICK.externalLink"
            :href="LOGOS.LOGO_HEADER_CLICK.externalLink.url"
            :target="LOGOS.LOGO_HEADER_CLICK.externalLink.target"
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
        <!-- dynamic brand menus -->
        <ds-flex-item
          v-for="item in menu"
          :key="item.name"
          class="branding-menu"
          :width="{ base: 'auto' }"
          style="margin-right: 20px"
        >
          <a v-if="item.url" :href="item.url" :target="item.target">
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
        <!-- search field -->
        <ds-flex-item
          v-if="isLoggedIn"
          id="nav-search-box"
          class="header-search"
          :width="{ base: 'auto' }"
        >
          <search-field />
        </ds-flex-item>
        <!-- filter menu -->
        <!-- TODO: Filter is only visible on index -->
        <ds-flex-item
          v-if="isLoggedIn && SHOW_CONTENT_FILTER_HEADER_MENU"
          style="flex-grow: 0; flex-basis: auto"
        >
          <client-only>
            <filter-menu v-show="showFilterMenuDropdown" />
          </client-only>
        </ds-flex-item>
        <!-- right symbols -->
        <ds-flex-item style="flex: none">
          <div class="main-navigation-right" style="flex-basis: auto">
            <!-- locale switch -->
            <locale-switch class="topbar-locale-switch" placement="top" offset="8" />
            <template v-if="isLoggedIn">
              <!-- chat menu -->
              <client-only>
                <chat-notification-menu placement="top" />
              </client-only>
              <!-- notification menu -->
              <client-only>
                <notification-menu placement="top" />
              </client-only>
              <!-- invite button -->
              <div v-if="inviteRegistration">
                <client-only>
                  <invite-button placement="top" />
                </client-only>
              </div>
              <!-- group button -->
              <client-only v-if="SHOW_GROUP_BUTTON_IN_HEADER">
                <group-button />
              </client-only>
              <!-- map button -->
              <client-only v-if="!isEmpty(this.$env.MAPBOX_TOKEN)">
                <map-button />
              </client-only>
              <!-- custom button -->
              <client-only v-if="!isEmpty(customButton)">
                <custom-button :settings="customButton" />
              </client-only>
              <!-- avatar menu -->
              <client-only>
                <avatar-menu placement="top" />
              </client-only>
            </template>
          </div>
        </ds-flex-item>
      </ds-flex>

      <!-- mobile header menu -->
      <div v-else class="mobil-header-box">
        <!-- logo, hamburger-->
        <ds-flex style="align-items: center">
          <ds-flex-item :width="{ base: LOGOS.LOGO_HEADER_WIDTH }" class="logo-container">
            <div @click="toggleMobileMenu ? toggleMobileMenuView() : ''">
              <a
                v-if="LOGOS.LOGO_HEADER_CLICK.externalLink"
                :href="LOGOS.LOGO_HEADER_CLICK.externalLink.url"
                :target="LOGOS.LOGO_HEADER_CLICK.externalLink.target"
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
            </div>
          </ds-flex-item>

          <!-- mobile hamburger menu -->
          <ds-flex-item class="mobile-hamburger-menu">
            <client-only>
              <!-- chat menu -->
              <div>
                <chat-notification-menu />
              </div>
              <!-- notification menu -->
              <div>
                <notification-menu no-menu />
              </div>
            </client-only>
            <!-- hamburger menu -->
            <base-button
              icon="bars"
              @click="toggleMobileMenuView"
              circle
              class="hamburger-button"
            />
          </ds-flex-item>
        </ds-flex>
        <!-- search, filter -->
        <ds-flex class="mobile-menu">
          <!-- search field mobile -->
          <ds-flex-item
            v-if="isLoggedIn"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="padding: 20px"
          >
            <search-field />
          </ds-flex-item>
          <!-- filter menu mobile -->
          <ds-flex-item
            v-if="isLoggedIn"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="flex-grow: 0; flex-basis: auto; padding: 20px 0"
          >
            <client-only>
              <filter-menu v-if="showFilterMenuDropdown && SHOW_CONTENT_FILTER_HEADER_MENU" />
            </client-only>
          </ds-flex-item>
        </ds-flex>
        <!-- right symbols -->
        <ds-flex style="margin: 0 20px">
          <!-- locale switch mobile -->
          <ds-flex-item :class="{ 'hide-mobile-menu': !toggleMobileMenu }">
            <locale-switch
              class="topbar-locale-switch topbar-locale-switch-mobile"
              placement="top"
              offset="8"
            />
          </ds-flex-item>
          <!-- invite button mobile -->
          <ds-flex-item
            v-if="inviteRegistration"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <invite-button placement="top" />
            </client-only>
          </ds-flex-item>
          <!-- group button -->
          <ds-flex-item
            v-if="SHOW_GROUP_BUTTON_IN_HEADER"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <div @click="toggleMobileMenuView">
                <group-button />
              </div>
            </client-only>
          </ds-flex-item>
          <!-- map button -->
          <ds-flex-item
            v-if="!isEmpty(this.$env.MAPBOX_TOKEN)"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <div @click="toggleMobileMenuView">
                <map-button />
              </div>
            </client-only>
          </ds-flex-item>
          <!-- custom button -->
          <ds-flex-item
            v-if="!isEmpty(customButton)"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <div @click="toggleMobileMenuView">
                <custom-button :settings="customButton" />
              </div>
            </client-only>
          </ds-flex-item>
          <!-- avatar menu mobile -->
          <ds-flex-item :class="{ 'hide-mobile-menu': !toggleMobileMenu }" style="text-align: end">
            <client-only>
              <avatar-menu placement="top" @toggle-Mobile-Menu-view="toggleMobileMenuView" />
            </client-only>
          </ds-flex-item>
        </ds-flex>
        <div :class="{ 'hide-mobile-menu': !toggleMobileMenu }" class="mobile-menu footer-mobile">
          <!-- dynamic branding menus -->
          <ul v-if="isHeaderMenu" class="dynamic-branding-mobil">
            <li v-for="item in menu" :key="item.name">
              <a
                v-if="item.url"
                :href="item.url"
                :target="item.target"
                @click="toggleMobileMenuView"
              >
                <ds-text size="large" bold>
                  {{ $t(item.nameIdent) }}
                </ds-text>
              </a>
              <nuxt-link v-else :to="item.path">
                <div @click="toggleMobileMenuView">
                  <ds-text size="large" bold>
                    {{ $t(item.nameIdent) }}
                  </ds-text>
                </div>
              </nuxt-link>
            </li>
          </ul>
          <hr />
          <!-- dynamic footer menu in header  -->
          <ul class="dynamic-footer-mobil">
            <li
              v-for="pageParams in links.FOOTER_LINK_LIST"
              :key="pageParams.name"
              @click="toggleMobileMenuView"
            >
              <page-params-link :pageParams="pageParams">
                {{ $t(pageParams.internalPage.footerIdent) }}
              </page-params-link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </ds-container>
</template>

<script>
import { mapGetters } from 'vuex'
import isEmpty from 'lodash/isEmpty'
import { SHOW_GROUP_BUTTON_IN_HEADER } from '~/constants/groups.js'
import { SHOW_CONTENT_FILTER_HEADER_MENU } from '~/constants/filter.js'
import LOGOS from '~/constants/logosBranded.js'
import AvatarMenu from '~/components/AvatarMenu/AvatarMenu'
import ChatNotificationMenu from '~/components/ChatNotificationMenu/ChatNotificationMenu'
import CustomButton from '~/components/CustomButton/CustomButton'
import FilterMenu from '~/components/FilterMenu/FilterMenu.vue'
import GroupButton from '~/components/Group/GroupButton'
import headerMenuBranded from '~/constants/headerMenuBranded.js'
import InviteButton from '~/components/InviteButton/InviteButton'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Logo from '~/components/Logo/Logo'
import MapButton from '~/components/Map/MapButton'
import SearchField from '~/components/features/SearchField/SearchField.vue'
import NotificationMenu from '~/components/NotificationMenu/NotificationMenu'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  mixins: [GetCategories],
  components: {
    AvatarMenu,
    ChatNotificationMenu,
    CustomButton,
    FilterMenu,
    GroupButton,
    InviteButton,
    LocaleSwitch,
    Logo,
    MapButton,
    NotificationMenu,
    PageParamsLink,
    SearchField,
  },
  props: {
    showMobileMenu: { type: Boolean, default: false },
  },
  data() {
    return {
      hideNavbar: false,
      prevScrollpos: 0,
      isEmpty,
      links,
      LOGOS,
      SHOW_GROUP_BUTTON_IN_HEADER,
      SHOW_CONTENT_FILTER_HEADER_MENU,
      isHeaderMenu: headerMenuBranded.MENU.length > 0,
      customButton: headerMenuBranded.CUSTOM_BUTTON,
      menu: headerMenuBranded.MENU,
      mobileSearchVisible: false,
      toggleMobileMenu: false,
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling,
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
    handleScroll() {
      const currentScrollPos = window.pageYOffset
      if (this.prevScrollpos > 50) {
        if (this.prevScrollpos > currentScrollPos) {
          this.hideNavbar = false
        } else {
          this.hideNavbar = true
        }
      }
      this.prevScrollpos = currentScrollPos
    },
    toggleMobileMenuView() {
      this.toggleMobileMenu = !this.toggleMobileMenu
    },
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll)
  },
}
</script>

<style lang="scss">
#navbar {
  padding: 10px 10px;
}
.hide-navbar {
  display: none;
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
  margin-right: $space-xx-small;
  align-self: center;
  display: inline-flex;
}
.topbar-locale-switch-mobile {
  margin-top: $space-xx-small;
}
.main-navigation-flex {
  display: flex;
  align-items: center;
  flex-wrap: nowrap !important;
  gap: 20px;
  min-width: 0;
}
@media (max-width: 800px) {
  .main-navigation-flex {
    gap: 10px;
  }
}

.logo-wrapper {
  flex: 0 0 auto;
}
.branding-menu {
  flex: 0 0 auto;
  white-space: nowrap;
}
.header-search {
  flex: 1 1 auto !important;
}
.navigation-actions {
  flex: 0 0 auto;
}

.main-navigation-right {
  display: flex;
  justify-content: flex-end;
}

// Mobile Header mit verbessertem Layout
.mobil-header-box {
  .logo-container {
    flex: 1 1 auto;
    min-width: 60px;
    max-width: calc(100vw - 200px);
  }

  .mobile-hamburger-menu {
    flex: 0 0 auto; // no shrinking
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;

    > div {
      flex-shrink: 0; // Buttons remain their size

      button {
        overflow: visible;
        .svg {
          height: 1.8em;
        }
      }
    }
  }
  .hamburger-button .svg {
    height: 1.5em;
  }
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
.hide-mobile-menu {
  display: none;
}
</style>

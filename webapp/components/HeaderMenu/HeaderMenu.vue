<template>
  <div
    class="ds-container ds-container-x-large main-navigation-container"
    :class="{ 'hide-navbar': hideNavbar }"
    id="navbar"
  >
    <div>
      <!-- header menu -->
      <div v-if="!showMobileMenu" class="ds-flex main-navigation-flex">
        <!-- logo -->
        <div class="ds-flex-item logo-wrapper" style="flex: 0 0 auto">
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
        <!-- dynamic brand menus -->
        <div
          v-for="item in menu"
          :key="item.name"
          class="ds-flex-item branding-menu"
          style="flex: 0 0 auto; margin-right: 20px"
        >
          <a v-if="item.url" :href="item.url" :target="item.target">
            <p class="ds-text ds-text-size-large ds-text-bold">
              {{ $t(item.nameIdent) }}
            </p>
          </a>
          <nuxt-link v-else :to="item.path">
            <p class="ds-text ds-text-size-large ds-text-bold">
              {{ $t(item.nameIdent) }}
            </p>
          </nuxt-link>
        </div>
        <!-- search field -->
        <div
          v-if="isLoggedIn"
          id="nav-search-box"
          class="ds-flex-item header-search"
          style="flex: 0 0 auto"
        >
          <search-field />
        </div>
        <!-- filter menu -->
        <!-- TODO: Filter is only visible on index -->
        <div
          v-if="isLoggedIn && SHOW_CONTENT_FILTER_HEADER_MENU"
          class="ds-flex-item"
          style="flex-grow: 0; flex-basis: auto"
        >
          <client-only>
            <filter-menu v-show="showFilterMenuDropdown" />
          </client-only>
        </div>
        <!-- right symbols -->
        <div class="ds-flex-item" style="flex: none">
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
                <os-button
                  as="nuxt-link"
                  to="/groups"
                  variant="primary"
                  appearance="ghost"
                  circle
                  :aria-label="$t('header.groups.tooltip')"
                  v-tooltip="{
                    content: $t('header.groups.tooltip'),
                    placement: 'bottom-start',
                  }"
                >
                  <template #icon>
                    <os-icon :icon="icons.users" />
                  </template>
                </os-button>
              </client-only>
              <!-- map button -->
              <client-only v-if="!isEmpty(this.$env.MAPBOX_TOKEN)">
                <os-button
                  as="nuxt-link"
                  to="/map"
                  class="map-button"
                  variant="primary"
                  appearance="ghost"
                  circle
                  :aria-label="$t('header.map.tooltip')"
                  v-tooltip="{
                    content: $t('header.map.tooltip'),
                    placement: 'bottom-start',
                  }"
                >
                  <template #icon>
                    <os-icon :icon="icons.globeDetailed" size="xl" />
                  </template>
                </os-button>
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
        </div>
      </div>

      <!-- mobile header menu -->
      <div v-else class="mobil-header-box">
        <!-- logo, hamburger-->
        <div class="ds-flex" style="align-items: center">
          <div
            class="ds-flex-item logo-container"
            :style="{ flex: '0 0 ' + LOGOS.LOGO_HEADER_WIDTH, width: LOGOS.LOGO_HEADER_WIDTH }"
          >
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
          </div>

          <!-- mobile hamburger menu -->
          <div class="ds-flex-item mobile-hamburger-menu">
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
            <os-button
              variant="primary"
              :appearance="toggleMobileMenu ? 'filled' : 'outline'"
              circle
              class="hamburger-button"
              :aria-label="$t('site.navigation')"
              @click="toggleMobileMenuView"
            >
              <template #icon>
                <os-icon :icon="icons.bars" />
              </template>
            </os-button>
          </div>
        </div>
        <!-- search, filter -->
        <div class="ds-flex mobile-menu">
          <!-- search field mobile -->
          <div
            v-if="isLoggedIn"
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="padding: 20px"
          >
            <search-field />
          </div>
          <!-- filter menu mobile -->
          <div
            v-if="isLoggedIn"
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="flex-grow: 0; flex-basis: auto; padding: 20px 0"
          >
            <client-only>
              <filter-menu v-if="showFilterMenuDropdown && SHOW_CONTENT_FILTER_HEADER_MENU" />
            </client-only>
          </div>
        </div>
        <!-- right symbols -->
        <div class="ds-flex" style="margin: 0 20px">
          <!-- locale switch mobile -->
          <div class="ds-flex-item" :class="{ 'hide-mobile-menu': !toggleMobileMenu }">
            <locale-switch
              class="topbar-locale-switch topbar-locale-switch-mobile"
              placement="top"
              offset="8"
            />
          </div>
          <!-- invite button mobile -->
          <div
            v-if="inviteRegistration"
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <invite-button placement="top" />
            </client-only>
          </div>
          <!-- group button -->
          <div
            v-if="SHOW_GROUP_BUTTON_IN_HEADER"
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <div @click="toggleMobileMenuView">
                <os-button
                  as="nuxt-link"
                  to="/groups"
                  variant="primary"
                  appearance="ghost"
                  circle
                  :aria-label="$t('header.groups.tooltip')"
                  v-tooltip="{
                    content: $t('header.groups.tooltip'),
                    placement: 'bottom-start',
                  }"
                >
                  <template #icon>
                    <os-icon :icon="icons.users" />
                  </template>
                </os-button>
              </div>
            </client-only>
          </div>
          <!-- map button -->
          <div
            v-if="!isEmpty(this.$env.MAPBOX_TOKEN)"
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <div @click="toggleMobileMenuView">
                <os-button
                  as="nuxt-link"
                  to="/map"
                  class="map-button"
                  variant="primary"
                  appearance="ghost"
                  circle
                  :aria-label="$t('header.map.tooltip')"
                  v-tooltip="{
                    content: $t('header.map.tooltip'),
                    placement: 'bottom-start',
                  }"
                >
                  <template #icon>
                    <os-icon :icon="icons.globeDetailed" size="xl" />
                  </template>
                </os-button>
              </div>
            </client-only>
          </div>
          <!-- custom button -->
          <div
            v-if="!isEmpty(customButton)"
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: center"
          >
            <client-only>
              <div @click="toggleMobileMenuView">
                <custom-button :settings="customButton" />
              </div>
            </client-only>
          </div>
          <!-- avatar menu mobile -->
          <div
            class="ds-flex-item"
            :class="{ 'hide-mobile-menu': !toggleMobileMenu }"
            style="text-align: end"
          >
            <client-only>
              <avatar-menu placement="top" @toggle-Mobile-Menu-view="toggleMobileMenuView" />
            </client-only>
          </div>
        </div>
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
                <p class="ds-text ds-text-size-large ds-text-bold">
                  {{ $t(item.nameIdent) }}
                </p>
              </a>
              <nuxt-link v-else :to="item.path">
                <div @click="toggleMobileMenuView">
                  <p class="ds-text ds-text-size-large ds-text-bold">
                    {{ $t(item.nameIdent) }}
                  </p>
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
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import isEmpty from 'lodash/isEmpty'
import { SHOW_GROUP_BUTTON_IN_HEADER } from '~/constants/groups.js'
import { SHOW_CONTENT_FILTER_HEADER_MENU } from '~/constants/filter.js'
import LOGOS from '~/constants/logosBranded.js'
import AvatarMenu from '~/components/AvatarMenu/AvatarMenu'
import ChatNotificationMenu from '~/components/ChatNotificationMenu/ChatNotificationMenu'
import CustomButton from '~/components/CustomButton/CustomButton'
import FilterMenu from '~/components/FilterMenu/FilterMenu.vue'
import headerMenuBranded from '~/constants/headerMenuBranded.js'
import InviteButton from '~/components/InviteButton/InviteButton'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Logo from '~/components/Logo/Logo'
import SearchField from '~/components/features/SearchField/SearchField.vue'
import NotificationMenu from '~/components/NotificationMenu/NotificationMenu'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  mixins: [GetCategories],
  components: {
    OsButton,
    OsIcon,
    AvatarMenu,
    ChatNotificationMenu,
    CustomButton,
    FilterMenu,
    InviteButton,
    LocaleSwitch,
    Logo,
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
  created() {
    this.icons = iconRegistry
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
      this.$nextTick(() => this.updateHeaderOffset())
    },
    updateHeaderOffset() {
      const el = this.$el
      if (el) {
        const height = this.hideNavbar ? 0 : el.offsetHeight
        document.documentElement.style.setProperty('--header-height', `${height}px`)
      }
    },
    toggleMobileMenuView() {
      this.toggleMobileMenu = !this.toggleMobileMenu
      this.$nextTick(() => this.updateHeaderOffset())
    },
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll)
    this.$nextTick(() => this.updateHeaderOffset())
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll)
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
        .os-icon {
          height: 1.8em;
        }
      }
    }
  }
  .hamburger-button .os-icon {
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
.map-button {
  margin-left: 3px;
  margin-right: 3px;

  .os-icon {
    margin: -4px;
  }
}
</style>

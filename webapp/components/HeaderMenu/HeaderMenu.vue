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
        <!-- Zeile 1: Logo + Search + Burger -->
        <div class="ds-flex" style="align-items: center">
          <!-- logo: icon when open, full logo when closed -->
          <div
            class="ds-flex-item logo-container"
            :style="{
              flex: toggleMobileMenu ? '0 0 auto' : '0 0 ' + LOGOS.LOGO_HEADER_WIDTH,
              width: toggleMobileMenu ? 'auto' : LOGOS.LOGO_HEADER_WIDTH,
            }"
          >
            <div @click="toggleMobileMenu ? toggleMobileMenuView() : ''">
              <a
                v-if="LOGOS.LOGO_HEADER_CLICK.externalLink"
                :href="LOGOS.LOGO_HEADER_CLICK.externalLink.url"
                :target="LOGOS.LOGO_HEADER_CLICK.externalLink.target"
              >
                <img
                  v-if="toggleMobileMenu"
                  src="/icon.png"
                  alt="Logo"
                  class="mobile-icon-logo"
                />
                <logo v-else logoType="header" />
              </a>
              <nuxt-link
                v-else
                :to="LOGOS.LOGO_HEADER_CLICK.internalPath.to"
                v-scroll-to="LOGOS.LOGO_HEADER_CLICK.internalPath.scrollTo"
              >
                <img
                  v-if="toggleMobileMenu"
                  src="/icon.png"
                  alt="Logo"
                  class="mobile-icon-logo"
                />
                <logo v-else logoType="header" />
              </nuxt-link>
            </div>
          </div>

          <!-- search field in header row (only when open + logged in) -->
          <div v-if="isLoggedIn && toggleMobileMenu" class="ds-flex-item mobile-header-search">
            <search-field />
          </div>

          <!-- mobile hamburger menu -->
          <div
            class="ds-flex-item mobile-hamburger-menu"
            :style="{ flex: toggleMobileMenu ? '0 0 auto' : '1 0 auto' }"
          >
            <!-- chat + notifications only when closed -->
            <template v-if="!toggleMobileMenu">
              <client-only>
                <div>
                  <chat-notification-menu />
                </div>
                <div>
                  <notification-menu no-menu />
                </div>
              </client-only>
            </template>
            <!-- hamburger button -->
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

        <!-- User info with collapsible menu (only when open + logged in) -->
        <div v-if="toggleMobileMenu && isLoggedIn" class="mobile-user-info">
          <div class="mobile-user-header">
            <profile-avatar :profile="user" size="small" />
            <div class="mobile-user-details">
              <b>{{ userName }}</b>
              <span v-if="user.role !== 'user'" class="mobile-user-role">
                {{ user.role | camelCase }}
              </span>
            </div>
            <os-button
              variant="primary"
              appearance="ghost"
              circle
              :aria-label="$t('header.avatarMenu.button.tooltip')"
              @click="mobileAvatarMenuOpen = !mobileAvatarMenuOpen"
            >
              <template #icon>
                <os-icon :icon="mobileAvatarMenuOpen ? icons.angleUp : icons.angleDown" />
              </template>
            </os-button>
          </div>
          <div v-if="mobileAvatarMenuOpen" class="mobile-avatar-menu-items">
            <nuxt-link
              v-for="route in mobileAvatarRoutes"
              :key="route.path"
              :to="route.path"
              class="mobile-avatar-menu-item"
              @click.native="toggleMobileMenuView"
            >
              <os-icon :icon="route.icon" />
              {{ route.name }}
            </nuxt-link>
            <hr />
            <nuxt-link
              class="mobile-avatar-menu-item logout-link"
              :to="{ name: 'logout' }"
              @click.native="toggleMobileMenuView"
            >
              <os-icon :icon="icons.signOut" />
              {{ $t('login.logout') }}
            </nuxt-link>
          </div>
        </div>

        <!-- Zeile 2: Shortcuts (only when open) -->
        <div v-if="toggleMobileMenu" class="mobile-shortcuts-row">
          <client-only>
            <chat-notification-menu />
            <notification-menu no-menu />
          </client-only>
          <locale-switch
            class="topbar-locale-switch topbar-locale-switch-mobile"
            placement="top"
            offset="8"
          />
          <client-only v-if="inviteRegistration">
            <invite-button placement="top" />
          </client-only>
          <client-only v-if="SHOW_GROUP_BUTTON_IN_HEADER">
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
          <client-only v-if="!isEmpty(this.$env.MAPBOX_TOKEN)">
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
          <client-only v-if="!isEmpty(customButton)">
            <div @click="toggleMobileMenuView">
              <custom-button :settings="customButton" />
            </div>
          </client-only>
        </div>

        <!-- filter menu (only when open + logged in) -->
        <div
          v-if="isLoggedIn && toggleMobileMenu && showFilterMenuDropdown && SHOW_CONTENT_FILTER_HEADER_MENU"
          class="mobile-menu"
          style="padding: 20px 0"
        >
          <client-only>
            <filter-menu />
          </client-only>
        </div>

        <!-- footer (only when open) -->
        <div v-if="toggleMobileMenu" class="mobile-menu footer-mobile">
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
          <!-- dynamic footer menu in header -->
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
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
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
    ProfileAvatar,
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
      toggleMobileMenu: false,
      mobileAvatarMenuOpen: false,
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling,
    }
  },
  computed: {
    ...mapGetters({
      isLoggedIn: 'auth/isLoggedIn',
      user: 'auth/user',
      isModerator: 'auth/isModerator',
      isAdmin: 'auth/isAdmin',
    }),
    showFilterMenuDropdown() {
      const [firstRoute] = this.$route.matched
      return firstRoute && firstRoute.name === 'index'
    },
    userName() {
      const { name } = this.user || {}
      return name || this.$t('profile.userAnonym')
    },
    mobileAvatarRoutes() {
      if (!this.user.slug) return []
      const routes = [
        {
          name: this.$t('header.avatarMenu.myProfile'),
          path: `/profile/${this.user.id}/${this.user.slug}`,
          icon: this.icons.user,
        },
        {
          name: this.$t('header.avatarMenu.groups'),
          path: '/groups',
          icon: this.icons.users,
        },
        {
          name: this.$t('header.avatarMenu.map'),
          path: '/map',
          icon: this.icons.globe,
        },
        {
          name: this.$t('header.avatarMenu.chats'),
          path: '/chat',
          icon: this.icons.chatBubble,
        },
        {
          name: this.$t('header.avatarMenu.notifications'),
          path: '/notifications',
          icon: this.icons.bell,
        },
        {
          name: this.$t('settings.name'),
          path: '/settings',
          icon: this.icons.cogs,
        },
      ]
      if (this.isModerator) {
        routes.push({
          name: this.$t('moderation.name'),
          path: '/moderation',
          icon: this.icons.balanceScale,
        })
      }
      if (this.isAdmin) {
        routes.push({
          name: this.$t('admin.name'),
          path: '/admin',
          icon: this.icons.shield,
        })
      }
      return routes
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    handleScroll() {
      const currentScrollPos = window.pageYOffset
      const wasHidden = this.hideNavbar
      if (this.prevScrollpos > 50) {
        this.hideNavbar = this.prevScrollpos <= currentScrollPos
      }
      this.prevScrollpos = currentScrollPos
      if (wasHidden !== this.hideNavbar) {
        this.$nextTick(() => this.updateHeaderOffset())
      }
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
      if (!this.toggleMobileMenu) {
        this.mobileAvatarMenuOpen = false
      }
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
    min-width: 36px;
  }

  .mobile-icon-logo {
    width: 36px;
    height: 36px;
  }

  .mobile-header-search {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0 10px;
  }

  .mobile-hamburger-menu {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;

    > div {
      flex-shrink: 0;

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

  .mobile-shortcuts-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
  }

  .mobile-user-info {
    padding: 10px 0;
    border-bottom: 1px solid $color-neutral-90;
  }

  .mobile-user-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mobile-user-details {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    b {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .mobile-user-role {
    font-size: $font-size-small;
    color: $text-color-softer;
  }

  .mobile-avatar-menu-items {
    padding: 10px 0 0 0;

    hr {
      color: $color-neutral-90;
      background-color: $color-neutral-90;
      margin: 5px 0;
    }
  }

  .mobile-avatar-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    color: $text-color-base;

    &:hover {
      color: $text-color-link;
    }

    &.logout-link {
      color: $text-color-danger;
      &:hover {
        color: color.adjust($text-color-danger, $lightness: -10%);
      }
    }
  }
}
.dynamic-branding-mobil,
.dynamic-footer-mobil {
  line-height: 30px;
  font-size: large;
}
.dynamic-branding-mobil li {
  margin: 17px 0;
}
.map-button {
  margin-left: 3px;
  margin-right: 3px;

  .os-icon {
    margin: -4px;
  }
}
</style>

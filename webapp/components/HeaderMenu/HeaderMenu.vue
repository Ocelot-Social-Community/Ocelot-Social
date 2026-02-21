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
      <div
        v-else
        class="mobil-header-box"
        :class="{ 'mobil-header-box--open': toggleMobileMenu }"
        ref="mobileMenu"
      >
        <!-- Zeile 1: Logo/Search + Burger -->
        <div class="ds-flex mobile-header-row" style="align-items: center">
          <!-- logo (only when closed) -->
          <div
            v-if="!toggleMobileMenu"
            class="ds-flex-item logo-container"
            :style="{ flex: '0 0 ' + LOGOS.LOGO_HEADER_WIDTH, width: LOGOS.LOGO_HEADER_WIDTH }"
          >
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

          <!-- search field (only when open + logged in) -->
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

        <!-- Scrollable menu content (only when open) -->
        <div v-if="toggleMobileMenu" class="mobile-menu-scroll">

        <!-- User info with collapsible menu (only when open + logged in) -->
        <div v-if="toggleMobileMenu && isLoggedIn" class="mobile-user-info">
          <div class="mobile-user-header" @click="mobileAvatarMenuOpen = !mobileAvatarMenuOpen">
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
              class="mobile-collapse-toggle"
              :aria-label="$t('header.avatarMenu.button.tooltip')"
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
              <os-icon :icon="route.icon" class="mobile-icon-col" />
              {{ route.name }}
            </nuxt-link>
          </div>
        </div>

        <!-- Mobile nav items (only when open + logged in) -->
        <div v-if="toggleMobileMenu && isLoggedIn" class="mobile-nav-items">
          <nuxt-link to="/chat" class="mobile-nav-item" @click.native="toggleMobileMenuView">
            <client-only>
              <chat-notification-menu class="mobile-icon-col" />
            </client-only>
            <span>{{ $t('header.chats.tooltip') }}</span>
          </nuxt-link>
          <nuxt-link
            to="/notifications"
            class="mobile-nav-item"
            @click.native="toggleMobileMenuView"
          >
            <client-only>
              <notification-menu no-menu class="mobile-icon-col" />
            </client-only>
            <span>{{ $t('header.notifications.tooltip') }}</span>
          </nuxt-link>
          <nuxt-link
            v-if="!isEmpty(this.$env.MAPBOX_TOKEN)"
            to="/map"
            class="mobile-nav-item"
            @click.native="toggleMobileMenuView"
          >
            <os-button
              variant="primary"
              appearance="ghost"
              circle
              class="mobile-nav-icon-button mobile-icon-col map-button"
            >
              <template #icon>
                <os-icon :icon="icons.globeDetailed" size="xl" />
              </template>
            </os-button>
            <span>{{ $t('header.map.tooltip') }}</span>
          </nuxt-link>
          <nuxt-link
            v-if="SHOW_GROUP_BUTTON_IN_HEADER"
            to="/groups"
            class="mobile-nav-item"
            @click.native="toggleMobileMenuView"
          >
            <os-button variant="primary" appearance="ghost" circle class="mobile-nav-icon-button mobile-icon-col">
              <template #icon>
                <os-icon :icon="icons.users" />
              </template>
            </os-button>
            <span>{{ $t('header.groups.tooltip') }}</span>
          </nuxt-link>
          <nuxt-link
            v-if="inviteRegistration"
            to="/settings/invites"
            class="mobile-nav-item"
            @click.native="toggleMobileMenuView"
          >
            <os-button variant="primary" appearance="ghost" circle class="mobile-nav-icon-button mobile-icon-col">
              <template #icon>
                <os-icon :icon="icons.userPlus" />
              </template>
            </os-button>
            <span>{{ $t('invite-codes.button.tooltip') }}</span>
          </nuxt-link>
          <template v-if="!isEmpty(customButton)">
            <div class="mobile-nav-item" @click="toggleMobileMenuView">
              <custom-button :settings="customButton" />
            </div>
          </template>
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

        <!-- Locale switch collapsible (only when open) -->
        <div v-if="toggleMobileMenu" class="mobile-locale-section">
          <div
            class="mobile-nav-item"
            @click="mobileLocaleMenuOpen = !mobileLocaleMenuOpen"
          >
            <os-button variant="primary" appearance="ghost" circle class="mobile-nav-icon-button mobile-icon-col">
              <template #icon>
                <os-icon :icon="icons.globe" />
              </template>
            </os-button>
            <span>{{ $t('localeSwitch.tooltip') }} ({{ currentLocale.code.toUpperCase() }})</span>
            <os-button
              variant="primary"
              appearance="ghost"
              circle
              class="mobile-collapse-toggle"
            >
              <template #icon>
                <os-icon :icon="mobileLocaleMenuOpen ? icons.angleUp : icons.angleDown" />
              </template>
            </os-button>
          </div>
          <div v-if="mobileLocaleMenuOpen" class="mobile-locale-items">
            <a
              v-for="locale in sortedLocales"
              :key="locale.code"
              href="#"
              class="mobile-locale-item"
              :class="{ '--active': locale.code === $i18n.locale() }"
              @click.prevent="changeLocale(locale.code)"
            >
              <span class="mobile-locale-flag mobile-icon-col">{{ localeFlags[locale.code] }}</span>
              {{ locale.name }}
            </a>
          </div>
        </div>

        <!-- "More" collapsible section (only when open) -->
        <div v-if="toggleMobileMenu" class="mobile-more-section">
          <div class="mobile-more-header" @click="mobileMoreMenuOpen = !mobileMoreMenuOpen">
            <os-button variant="primary" appearance="ghost" circle class="mobile-nav-icon-button mobile-icon-col">
              <template #icon>
                <os-icon :icon="icons.questionCircle" />
              </template>
            </os-button>
            <span>{{ $t('header.more') }}</span>
            <os-button
              variant="primary"
              appearance="ghost"
              circle
              class="mobile-collapse-toggle"
            >
              <template #icon>
                <os-icon :icon="mobileMoreMenuOpen ? icons.angleUp : icons.angleDown" />
              </template>
            </os-button>
          </div>
          <div v-if="mobileMoreMenuOpen" class="mobile-more-items">
            <!-- dynamic branding menus -->
            <template v-if="isHeaderMenu">
              <template v-for="item in menu">
                <a
                  v-if="item.url"
                  :key="item.name"
                  :href="item.url"
                  :target="item.target"
                  class="mobile-more-item"
                  @click="toggleMobileMenuView"
                >
                  <os-icon :icon="icons.link" class="mobile-icon-col" />
                  {{ $t(item.nameIdent) }}
                </a>
                <nuxt-link
                  v-else
                  :key="item.name"
                  :to="item.path"
                  class="mobile-more-item"
                  @click.native="toggleMobileMenuView"
                >
                  <os-icon :icon="icons.link" class="mobile-icon-col" />
                  {{ $t(item.nameIdent) }}
                </nuxt-link>
              </template>
              <hr />
            </template>
            <!-- dynamic footer links -->
            <page-params-link
              v-for="pageParams in links.FOOTER_LINK_LIST"
              :key="pageParams.name"
              :pageParams="pageParams"
              class="mobile-more-item"
              @click.native="toggleMobileMenuView"
            >
              <os-icon :icon="moreItemIcon(pageParams.name)" class="mobile-icon-col" />
              {{ $t(pageParams.internalPage.footerIdent) }}
            </page-params-link>
          </div>
        </div>

        <!-- Logout (only when open + logged in) -->
        <nuxt-link
          v-if="toggleMobileMenu && isLoggedIn"
          :to="{ name: 'logout' }"
          class="mobile-nav-item mobile-logout-item"
          @click.native="toggleMobileMenuView"
        >
          <os-button variant="danger" appearance="ghost" circle class="mobile-nav-icon-button mobile-icon-col">
            <template #icon>
              <os-icon :icon="icons.signOut" />
            </template>
          </os-button>
          <span>{{ $t('login.logout') }}</span>
        </nuxt-link>

        </div><!-- /mobile-menu-scroll -->
      </div>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import gql from 'graphql-tag'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import orderBy from 'lodash/orderBy'
import locales from '~/locales'
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
      mobileMoreMenuOpen: false,
      mobileLocaleMenuOpen: false,
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling,
      localeFlags: {
        en: '🇬🇧',
        de: '🇩🇪',
        nl: '🇳🇱',
        fr: '🇫🇷',
        it: '🇮🇹',
        es: '🇪🇸',
        pt: '🇵🇹',
        pl: '🇵🇱',
        ru: '🇷🇺',
      },
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
    currentLocale() {
      return find(locales, { code: this.$i18n.locale() }) || { code: 'en', name: 'English' }
    },
    sortedLocales() {
      return orderBy(locales, 'name')
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
    handleClickOutside(event) {
      if (this.toggleMobileMenu && this.$refs.mobileMenu && !this.$refs.mobileMenu.contains(event.target)) {
        this.toggleMobileMenuView()
      }
    },
    toggleMobileMenuView() {
      this.toggleMobileMenu = !this.toggleMobileMenu
      this.$nextTick(() => this.updateHeaderOffset())
      if (!this.toggleMobileMenu) {
        this.mobileAvatarMenuOpen = false
        this.mobileMoreMenuOpen = false
        this.mobileLocaleMenuOpen = false
      }
    },
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    moreItemIcon(name) {
      const iconMap = {
        'organization': this.icons.home,
        'terms-and-conditions': this.icons.book,
        'code-of-conduct': this.icons.handPointer,
        'data-privacy': this.icons.lock,
        'faq': this.icons.questionCircle,
        'donate': this.icons.heartO,
        'support': this.icons.comments,
        'imprint': this.icons.balanceScale,
      }
      return iconMap[name] || this.icons.link
    },
    changeLocale(code) {
      this.$i18n.set(code)
      this.mobileLocaleMenuOpen = false
      this.updateUserLocale()
    },
    async updateUserLocale() {
      if (!this.user || !this.user.id) return
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation ($id: ID!, $locale: String) {
              UpdateUser(id: $id, locale: $locale) {
                id
                locale
              }
            }
          `,
          variables: {
            id: this.user.id,
            locale: this.$i18n.locale(),
          },
          update: (store, { data: { UpdateUser } }) => {
            this.setCurrentUser({
              ...this.user,
              locale: UpdateUser.locale,
            })
          },
        })
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll)
    this.$nextTick(() => this.updateHeaderOffset())
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('click', this.handleClickOutside)
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
  &.mobil-header-box--open {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 20px);
  }

  .mobile-header-row {
    flex-shrink: 0;
  }

  .mobile-menu-scroll {
    flex: 1 1 auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

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
    padding: 0 10px 0 0;
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

  .mobile-collapse-toggle {
    margin-left: auto;
    flex-shrink: 0;
    pointer-events: none; // Parent handles click
  }

  // Consistent icon column width across all menu items
  .mobile-icon-col {
    min-width: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mobile-nav-items {
    padding: 0;
  }

  .mobile-nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    color: $text-color-base;
    min-height: 36px;

    &:hover {
      color: $text-color-link-active;
      background-color: $background-color-soft;
    }

    &.nuxt-link-active,
    &.router-link-active {
      color: $text-color-link;
      background-color: $background-color-soft;
      box-shadow: inset 3px 0 0 $color-primary;
    }

    &.mobile-logout-item {
      color: $text-color-danger;
      border-top: 1px solid $color-neutral-90;
      padding-top: 4px;
      margin-top: 2px;

      &:hover {
        color: color.adjust($text-color-danger, $lightness: -10%);
        background-color: $background-color-soft;
      }

      &.nuxt-link-active,
      &.router-link-active {
        color: $text-color-danger;
        box-shadow: none;
        background-color: transparent;
      }
    }

    // Flatten embedded component buttons to plain icons
    .chat-notification-menu,
    .notifications-menu,
    .mobile-nav-icon-button {
      margin: 0;
      display: inline-flex;
      padding: 0;
      border: none;
      background: none;
      box-shadow: none;
      min-width: auto;
      min-height: auto;
      width: auto;
      height: auto;
      pointer-events: none; // Let parent nuxt-link handle navigation

      &:hover,
      &:focus {
        background: none;
        box-shadow: none;
      }

      .os-button {
        padding: 0;
        border: none;
        background: none;
        box-shadow: none;
        min-width: auto;
        min-height: auto;
        width: auto;
        height: auto;
        pointer-events: none;

        &:hover,
        &:focus {
          background: none;
          box-shadow: none;
        }
      }
    }
  }

  .mobile-user-info {
    padding: 6px 0;
    border-bottom: 1px solid $color-neutral-90;
  }

  .mobile-user-header {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;

    &:hover {
      background-color: $background-color-soft;
    }
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
    padding: 4px 0 0 0;

    hr {
      color: $color-neutral-90;
      background-color: $color-neutral-90;
      margin: 2px 0;
    }
  }

  .mobile-avatar-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    min-height: 32px;
    color: $text-color-base;

    &:hover {
      color: $text-color-link-active;
      background-color: $background-color-soft;
    }

    &.nuxt-link-active,
    &.router-link-active {
      color: $text-color-link;
      background-color: $background-color-soft;
      box-shadow: inset 3px 0 0 $color-primary;
    }
  }

  .mobile-more-section {
    padding: 2px 0;
    border-top: 1px solid $color-neutral-90;
  }

  .mobile-more-header {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 2px 0;
    min-height: 36px;

    &:hover {
      color: $text-color-link-active;
      background-color: $background-color-soft;
    }
  }

  .mobile-more-items {
    padding: 0;

    hr {
      color: $color-neutral-90;
      background-color: $color-neutral-90;
      margin: 2px 0;
    }
  }

  .mobile-more-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    min-height: 32px;
    color: $text-color-base;

    &:hover {
      color: $text-color-link-active;
      background-color: $background-color-soft;
    }

    &.nuxt-link-active,
    &.router-link-active {
      color: $text-color-link;
      background-color: $background-color-soft;
      box-shadow: inset 3px 0 0 $color-primary;
    }
  }

  .mobile-locale-section {
    padding: 2px 0;

    > .mobile-nav-item {
      cursor: pointer;
    }
  }

  .mobile-locale-items {
    padding: 0;
  }

  .mobile-locale-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    min-height: 32px;
    color: $text-color-base;

    &:hover {
      color: $text-color-link-active;
      background-color: $background-color-soft;
    }

    &.--active {
      font-weight: bold;
      color: $text-color-link;
      background-color: $background-color-soft;
      box-shadow: inset 3px 0 0 $color-primary;
    }
  }

  .mobile-locale-flag {
    font-size: 1.2em;
    line-height: 1;
  }
}
.map-button {
  margin-left: 3px;
  margin-right: 3px;

  .os-icon {
    margin: -4px;
  }
}
</style>

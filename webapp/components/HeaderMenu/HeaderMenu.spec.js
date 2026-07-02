import Vuex from 'vuex'
import { shallowMount } from '@vue/test-utils'
import HeaderMenu from './HeaderMenu.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
  'client-only': true,
}

describe('HeaderMenu', () => {
  let authState
  let postsActive
  let categoriesList
  let policyValues
  let mocks

  const buildStore = () =>
    new Vuex.Store({
      modules: {
        auth: {
          namespaced: true,
          getters: {
            isLoggedIn: () => authState.isLoggedIn,
            user: () => authState.user,
            canAccessModeration: () => authState.canAccessModeration,
            isAdmin: () => authState.isAdmin,
          },
          mutations: {
            SET_USER: (_state, value) => {
              authState.user = value
            },
          },
        },
        posts: {
          namespaced: true,
          getters: { isActive: () => postsActive },
        },
        categories: {
          namespaced: true,
          getters: {
            categories: () => categoriesList,
            isInitialized: () => true,
          },
          actions: { init: jest.fn() },
        },
      },
    })

  const directives = { 'scroll-to': {} }
  let wrappers
  const Wrapper = () => {
    const wrapper = shallowMount(HeaderMenu, { store: buildStore(), mocks, localVue, stubs, directives })
    wrappers.push(wrapper)
    return wrapper
  }

  beforeEach(() => {
    wrappers = []
    authState = {
      isLoggedIn: true,
      user: { id: 'u1', slug: 'peter', name: 'Peter' },
      canAccessModeration: false,
      isAdmin: false,
    }
    postsActive = false
    categoriesList = [{ id: 'c1' }]
    policyValues = {}
    mocks = {
      $t: jest.fn((key) => key),
      $can: jest.fn(() => true),
      $env: { NETWORK_NAME: 'Test', MAPBOX_TOKEN: '' },
      $policy: { get: (key) => policyValues[key] },
      $route: { matched: [{ name: 'index' }], path: '/' },
      $i18n: { locale: () => 'en', set: jest.fn() },
      $apollo: { mutate: jest.fn().mockResolvedValue({ data: { UpdateUser: { locale: 'de' } } }) },
      $toast: { success: jest.fn(), error: jest.fn() },
    }
  })

  // Destroy every mounted instance so its global scroll/mousemove/click listeners
  // are removed and can't bleed into later tests. destroy() is a no-op on an
  // already-destroyed wrapper (e.g. the lifecycle test that destroys itself).
  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.destroy())
  })

  describe('computed', () => {
    it('reads policy-driven layout toggles', () => {
      policyValues = {
        inviteRegistration: true,
        showGroupButtonInHeader: true,
        showContentFilterHeaderMenu: true,
      }
      const wrapper = Wrapper()
      expect(wrapper.vm.inviteRegistration).toBe(true)
      expect(wrapper.vm.SHOW_GROUP_BUTTON_IN_HEADER).toBe(true)
      expect(wrapper.vm.SHOW_CONTENT_FILTER_HEADER_MENU).toBe(true)
    })

    it('showFilterMenuDropdown is true only on the index route', () => {
      // Fresh wrapper per route state so the assertion never depends on a
      // computed cache being invalidated by a mutated $route mock.
      mocks.$route.matched = [{ name: 'index' }]
      expect(Wrapper().vm.showFilterMenuDropdown).toBe(true)
      mocks.$route.matched = [{ name: 'other' }]
      expect(Wrapper().vm.showFilterMenuDropdown).toBe(false)
      mocks.$route.matched = []
      expect(Wrapper().vm.showFilterMenuDropdown).toBeFalsy()
    })

    it('userName falls back to the anonymous label without a user', () => {
      expect(Wrapper().vm.userName).toBe('Peter')
      authState.user = null
      expect(Wrapper().vm.userName).toBe('profile.userAnonym')
    })

    it('currentLocale resolves the active locale and defaults otherwise', () => {
      expect(Wrapper().vm.currentLocale.code).toBe('en')
      // Unknown locale → falls back to the first configured locale. A fresh
      // wrapper avoids relying on the computed re-running after the mock changes.
      mocks.$i18n.locale = () => 'xx-unknown'
      const fallback = Wrapper().vm.currentLocale
      expect(fallback).toBeTruthy()
      expect(fallback.code).toBeDefined()
    })

    it('sortedLocales is ordered by name', () => {
      const wrapper = Wrapper()
      const names = wrapper.vm.sortedLocales.map((l) => l.name)
      expect(names).toEqual([...names].sort())
    })

    it('mobileAvatarRoutes grows with moderation and admin privileges', () => {
      expect(Wrapper().vm.mobileAvatarRoutes).toHaveLength(2)
      authState.canAccessModeration = true
      authState.isAdmin = true
      expect(Wrapper().vm.mobileAvatarRoutes).toHaveLength(4)
      authState.user = null
      expect(Wrapper().vm.mobileAvatarRoutes).toEqual([])
    })

    it('mobileAvatarMenuOpen reflects the toggle then the route', () => {
      // An explicit toggle wins over the route.
      const wrapper = Wrapper()
      wrapper.vm.mobileAvatarMenuOpen = true
      expect(wrapper.vm.mobileAvatarMenuOpen).toBe(true)
      // Without a toggle (fresh wrapper, toggled === null) it follows the route.
      mocks.$route.path = '/settings'
      expect(Wrapper().vm.mobileAvatarMenuOpen).toBe(true)
      mocks.$route.path = '/somewhere-else'
      expect(Wrapper().vm.mobileAvatarMenuOpen).toBe(false)
    })

    it('mobileMoreMenuOpen reflects the toggle then the footer route', () => {
      const wrapper = Wrapper()
      wrapper.vm.mobileMoreMenuOpen = true
      expect(wrapper.vm.mobileMoreMenuOpen).toBe(true)
      // Without a toggle, a clearly-unrelated (non-footer) path stays closed.
      mocks.$route.path = '/definitely-not-a-footer-page'
      expect(Wrapper().vm.mobileMoreMenuOpen).toBe(false)
    })
  })

  describe('scroll handling', () => {
    it('does nothing while the mobile menu is open', () => {
      const wrapper = Wrapper()
      wrapper.vm.toggleMobileMenu = true
      wrapper.vm.hideNavbar = false
      wrapper.vm.handleScroll()
      expect(wrapper.vm.hideNavbar).toBe(false)
    })

    it('reveals the navbar when scrolling up past the threshold', async () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'updateHeaderOffset')
      wrapper.vm.prevScrollpos = 100
      wrapper.vm.hideNavbar = true
      window.pageYOffset = 60
      wrapper.vm.handleScroll()
      expect(wrapper.vm.hideNavbar).toBe(false)
      await wrapper.vm.$nextTick()
      expect(spy).toHaveBeenCalled()
    })

    it('hides the navbar when scrolling down past the threshold', () => {
      const wrapper = Wrapper()
      wrapper.vm.prevScrollpos = 100
      wrapper.vm.hideNavbar = false
      window.pageYOffset = 200
      wrapper.vm.handleScroll()
      expect(wrapper.vm.hideNavbar).toBe(true)
    })

    it('leaves the navbar untouched below the threshold', () => {
      const wrapper = Wrapper()
      wrapper.vm.prevScrollpos = 10
      wrapper.vm.hideNavbar = false
      window.pageYOffset = 20
      wrapper.vm.handleScroll()
      expect(wrapper.vm.hideNavbar).toBe(false)
    })
  })

  describe('updateHeaderOffset', () => {
    it('sets the header height CSS variable from the element', () => {
      const wrapper = Wrapper()
      wrapper.vm.hideNavbar = false
      wrapper.vm.updateHeaderOffset()
      expect(document.documentElement.style.getPropertyValue('--header-height')).toMatch(/px$/)
    })

    it('reports zero height while hidden', () => {
      const wrapper = Wrapper()
      wrapper.vm.hideNavbar = true
      wrapper.vm.updateHeaderOffset()
      expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('0px')
    })
  })

  describe('mouse move reveal/hide', () => {
    it('reveals a hidden navbar near the top edge', () => {
      const wrapper = Wrapper()
      wrapper.vm.hideNavbar = true
      wrapper.vm.handleMouseMove({ clientY: 10 })
      expect(wrapper.vm.hideNavbar).toBe(false)
      expect(wrapper.vm.navbarRevealedByHover).toBe(true)
    })

    it('re-hides a hover-revealed navbar when the cursor leaves it', () => {
      const wrapper = Wrapper()
      wrapper.vm.hideNavbar = false
      wrapper.vm.navbarRevealedByHover = true
      wrapper.vm.handleMouseMove({ clientY: 500 })
      expect(wrapper.vm.hideNavbar).toBe(true)
      expect(wrapper.vm.navbarRevealedByHover).toBe(false)
    })

    it('does nothing otherwise', () => {
      const wrapper = Wrapper()
      wrapper.vm.hideNavbar = false
      wrapper.vm.navbarRevealedByHover = false
      wrapper.vm.handleMouseMove({ clientY: 10 })
      expect(wrapper.vm.hideNavbar).toBe(false)
    })
  })

  describe('mobile menu', () => {
    it('toggleMobileMenuView opens and locks body scroll, then resets on close', () => {
      const wrapper = Wrapper()
      wrapper.vm.toggleMobileMenuView()
      expect(wrapper.vm.toggleMobileMenu).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')
      wrapper.vm.mobileAvatarMenuToggled = true
      wrapper.vm.toggleMobileMenuView()
      expect(wrapper.vm.toggleMobileMenu).toBe(false)
      expect(document.body.style.overflow).toBe('')
      expect(wrapper.vm.mobileAvatarMenuToggled).toBeNull()
    })

    it('handleClickOutside closes the menu when clicking outside it', () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'toggleMobileMenuView')
      wrapper.vm.toggleMobileMenu = true
      wrapper.vm.$refs.mobileMenu = { contains: () => false }
      wrapper.vm.handleClickOutside({ target: {} })
      expect(spy).toHaveBeenCalled()
    })

    it('handleClickOutside ignores clicks inside the menu', () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'toggleMobileMenuView')
      wrapper.vm.toggleMobileMenu = true
      wrapper.vm.$refs.mobileMenu = { contains: () => true }
      wrapper.vm.handleClickOutside({ target: {} })
      expect(spy).not.toHaveBeenCalled()
    })

    it('closes the mobile menu on route change while open', () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'toggleMobileMenuView')
      wrapper.vm.toggleMobileMenu = true
      ;[].concat(wrapper.vm.$options.watch.$route).forEach((h) => h.call(wrapper.vm))
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('misc methods', () => {
    it('moreItemIcon maps known names and falls back for unknown ones', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.moreItemIcon('faq')).toBe(wrapper.vm.icons.questionCircle)
      expect(wrapper.vm.moreItemIcon('something-unknown')).toBe(wrapper.vm.icons.link)
    })

    it('changeLocale sets the locale, closes the menu and persists it', () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'updateUserLocale').mockResolvedValue()
      wrapper.vm.mobileLocaleMenuOpen = true
      wrapper.vm.changeLocale('de')
      expect(mocks.$i18n.set).toHaveBeenCalledWith('de')
      expect(wrapper.vm.mobileLocaleMenuOpen).toBe(false)
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('lifecycle', () => {
    it('removes listeners and restores body scroll on destroy', () => {
      const wrapper = Wrapper()
      const removeWin = jest.spyOn(window, 'removeEventListener')
      wrapper.destroy()
      expect(document.body.style.overflow).toBe('')
      expect(removeWin).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })
})

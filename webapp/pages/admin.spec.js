import { mount } from '@vue/test-utils'
import admin from './admin.vue'

const stubs = {
  'nuxt-child': true,
}

const localVue = global.localVue

describe('admin.vue', () => {
  let wrapper
  let mocks
  let policyValues

  beforeEach(() => {
    // Key-specific policy mock so the api-keys menu gating can be toggled per
    // scenario and a wrong/typo'd policy key resolves to false (off) — a blanket
    // mock would mask that. Defaults to everything off.
    policyValues = {}
    mocks = {
      $t: jest.fn((key) => key),
      $policy: { get: (key) => policyValues[key] ?? false },
      // Holds every permission by default; individual tests narrow this.
      $can: jest.fn(() => true),
    }
  })

  const Wrapper = () => mount(admin, { mocks, localVue, stubs })

  describe('mount', () => {
    it('renders', () => {
      wrapper = Wrapper()
      expect(wrapper.element.tagName).toBe('DIV')
    })
  })

  describe('active menu highlight', () => {
    it('matches by path, ignoring query params (keeps the highlight on ?q=…)', () => {
      mocks.$route = { path: '/admin/users', query: { q: 'role:moderator' } }
      wrapper = Wrapper()
      expect(wrapper.vm.matcher('/admin/users')).toBe(true)
      expect(wrapper.vm.matcher('/admin')).toBe(false)
    })

    it('returns false (without throwing) when $route is missing', () => {
      wrapper = Wrapper() // no $route mock
      expect(wrapper.vm.matcher('/admin/users')).toBe(false)
    })
  })

  describe('the API-keys admin menu item', () => {
    it('is hidden when the apiKeysEnabled policy is off', () => {
      wrapper = Wrapper() // policyValues empty ⇒ off
      expect(wrapper.text()).not.toContain('admin.api-keys.name')
    })

    it('is shown when the apiKeysEnabled policy is on (and the viewer may administer keys)', () => {
      policyValues = { apiKeysEnabled: true }
      wrapper = Wrapper()
      expect(wrapper.text()).toContain('admin.api-keys.name')
    })

    it('is hidden when the policy is on but the viewer lacks apiKey.administer', () => {
      policyValues = { apiKeysEnabled: true }
      mocks.$can = (permission) => permission !== 'apiKey.administer'
      wrapper = Wrapper()
      expect(wrapper.text()).not.toContain('admin.api-keys.name')
    })
  })

  describe('permission-gated sidebar', () => {
    it('shows only the tabs the viewer can access (plus the open read pages)', () => {
      mocks.$can = (permission) => permission === 'policy.manage'
      wrapper = Wrapper()
      const text = wrapper.text()
      expect(text).toContain('admin.policy.name') // has policy.manage
      expect(text).toContain('admin.categories.name') // open read page
      expect(text).not.toContain('admin.dashboard.name') // no network.statistics.read
      expect(text).not.toContain('admin.donations.name') // no donation.manage
    })

    it('shows the reports tab for a content moderator, hides it otherwise', () => {
      mocks.$can = (permission) => permission === 'content.moderate'
      expect(Wrapper().text()).toContain('moderation.reports.name')
      mocks.$can = (permission) => permission === 'policy.manage'
      expect(Wrapper().text()).not.toContain('moderation.reports.name')
    })
  })

  describe('landing redirect', () => {
    it('redirects from an inaccessible landing route to the first accessible one', () => {
      mocks.$can = (permission) => permission === 'policy.manage'
      mocks.$route = { path: '/admin' } // dashboard — needs network.statistics.read
      mocks.$router = { replace: jest.fn(() => Promise.resolve()) }
      wrapper = Wrapper()
      expect(mocks.$router.replace).toHaveBeenCalledWith('/admin/categories')
    })

    it('does not redirect when the current route is accessible', () => {
      mocks.$route = { path: '/admin/roles' }
      mocks.$router = { replace: jest.fn(() => Promise.resolve()) }
      wrapper = Wrapper()
      expect(mocks.$router.replace).not.toHaveBeenCalled()
    })
  })

  describe('rendering the current page', () => {
    // The redirect is client-only. On the server, rendering an inaccessible page would run
    // its queries, which the backend refuses — and that fails the whole server render.
    it('does not render a page the viewer cannot use, also not on the server', () => {
      mocks.$can = (permission) => permission === 'policy.manage'
      mocks.$route = { path: '/admin' }
      mocks.$router = { replace: jest.fn() }
      const original = process.server
      process.server = true
      try {
        wrapper = Wrapper()
      } finally {
        process.server = original
      }
      expect(mocks.$router.replace).not.toHaveBeenCalled()
      expect(wrapper.find('nuxt-child-stub').exists()).toBe(false)
    })

    it('renders a page the viewer can use', () => {
      mocks.$route = { path: '/admin/roles' }
      wrapper = Wrapper()
      expect(wrapper.find('nuxt-child-stub').exists()).toBe(true)
    })

    it('renders an unknown sub-route, which guards itself', () => {
      mocks.$can = () => false
      mocks.$route = { path: '/admin/users/some-id' }
      wrapper = Wrapper()
      expect(wrapper.find('nuxt-child-stub').exists()).toBe(true)
    })
  })
})

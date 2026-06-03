import { render } from '@testing-library/vue'
import settings from './settings.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-child': true,
}

describe('settings.vue', () => {
  let wrapper
  let mocks
  let policyValues

  beforeEach(() => {
    // Key-specific policy mock so the policy-gated tabs (invites, api-keys) can
    // be toggled per scenario; defaults to everything off.
    policyValues = {}
    mocks = {
      $t: jest.fn((key) => key),
      $route: { path: '/settings' },
      $router: { push: jest.fn() },
      $policy: { get: (key) => policyValues[key] ?? false },
    }
  })

  const Wrapper = () => {
    return render(settings, {
      mocks,
      localVue,
      stubs,
    })
  }

  describe('given badges are enabled', () => {
    beforeEach(() => {
      mocks.$env = {
        BADGES_ENABLED: true,
      }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('given badges are disabled', () => {
    beforeEach(() => {
      mocks.$env = {
        BADGES_ENABLED: false,
      }
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('policy-gated tabs', () => {
    beforeEach(() => {
      mocks.$env = { BADGES_ENABLED: false }
    })

    it('hides the invites and api-keys tabs when the policy disables them', () => {
      wrapper = Wrapper() // policyValues empty ⇒ both off
      expect(wrapper.queryAllByText('settings.invites.name')).toHaveLength(0)
      expect(wrapper.queryAllByText('settings.api-keys.name')).toHaveLength(0)
    })

    it('shows the invites and api-keys tabs when the policy enables them', () => {
      policyValues = { inviteRegistration: true, apiKeysEnabled: true }
      wrapper = Wrapper()
      expect(wrapper.queryAllByText('settings.invites.name').length).toBeGreaterThan(0)
      expect(wrapper.queryAllByText('settings.api-keys.name').length).toBeGreaterThan(0)
    })
  })
})

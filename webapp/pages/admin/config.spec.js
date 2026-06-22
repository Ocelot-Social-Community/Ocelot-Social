import { shallowMount } from '@vue/test-utils'
import config from './config.vue'

const localVue = global.localVue

const stubs = {
  'os-card': { template: '<div><slot /></div>' },
  'nuxt-link': { template: '<a><slot /></a>', props: ['to'] },
}

describe('admin/config.vue', () => {
  let wrapper
  const mocks = { $t: (key) => key }

  const Wrapper = (systemConfig = []) => {
    const w = shallowMount(config, { mocks, localVue, stubs })
    w.setData({ systemConfig })
    return w
  }

  const envGate = (overrides = {}) => ({
    gate: 'videoCall',
    open: false,
    source: 'env',
    policyKey: null,
    keys: [
      { key: 'LIVEKIT_URL', secret: false, state: 'set', value: 'wss://lk.example.org' },
      { key: 'LIVEKIT_API_KEY', secret: true, state: 'empty', value: null },
      { key: 'LIVEKIT_API_SECRET', secret: true, state: 'missing', value: null },
    ],
    ...overrides,
  })

  const policyGate = (overrides = {}) => ({
    gate: 'apiKeys',
    open: true,
    source: 'policy',
    policyKey: 'apiKeysEnabled',
    keys: [],
    ...overrides,
  })

  describe('stateClass', () => {
    it('maps presence state to badge severity', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.stateClass('set')).toBe('ok')
      expect(wrapper.vm.stateClass('empty')).toBe('warn')
      expect(wrapper.vm.stateClass('missing')).toBe('error')
    })
  })

  describe('gate status badge', () => {
    it('shows an error badge when the gate is closed', async () => {
      wrapper = Wrapper([envGate({ open: false })])
      await wrapper.vm.$nextTick()
      const badge = wrapper.find('[data-test="config-gate-videoCall-status"]')
      expect(badge.classes()).toContain('badge--error')
      expect(badge.text()).toBe('admin.config.statusNotConfigured')
    })

    it('shows an ok badge when the gate is open', async () => {
      wrapper = Wrapper([envGate({ open: true })])
      await wrapper.vm.$nextTick()
      const badge = wrapper.find('[data-test="config-gate-videoCall-status"]')
      expect(badge.classes()).toContain('badge--ok')
      expect(badge.text()).toBe('admin.config.statusConfigured')
    })
  })

  describe('env gate keys', () => {
    beforeEach(async () => {
      wrapper = Wrapper([envGate()])
      await wrapper.vm.$nextTick()
    })

    it('renders one row per env key with the right state badge', () => {
      expect(wrapper.find('[data-test="config-key-LIVEKIT_URL"] .badge--ok').exists()).toBe(true)
      expect(wrapper.find('[data-test="config-key-LIVEKIT_API_KEY"] .badge--warn').exists()).toBe(
        true,
      )
      expect(
        wrapper.find('[data-test="config-key-LIVEKIT_API_SECRET"] .badge--error').exists(),
      ).toBe(true)
    })

    it('shows the value for non-secret keys but masks secrets', () => {
      const url = wrapper.find('[data-test="config-key-LIVEKIT_URL"]')
      expect(url.text()).toContain('wss://lk.example.org')
      expect(url.find('.key__secret').exists()).toBe(false)

      const secret = wrapper.find('[data-test="config-key-LIVEKIT_API_KEY"]')
      expect(secret.find('.key__secret').exists()).toBe(true)
      expect(secret.find('.key__value').exists()).toBe(false)
    })
  })

  describe('policy gate', () => {
    beforeEach(async () => {
      wrapper = Wrapper([policyGate()])
      await wrapper.vm.$nextTick()
    })

    it('links to the policy tab and renders no env keys', () => {
      const section = wrapper.find('[data-test="config-gate-apiKeys"]')
      expect(section.find('.gate__link').exists()).toBe(true)
      expect(section.findAll('.key')).toHaveLength(0)
    })
  })
})

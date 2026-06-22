import { shallowMount } from '@vue/test-utils'
import config from './config.vue'

const localVue = global.localVue

const stubs = { 'os-card': { template: '<div><slot /></div>' } }

const SAMPLE = [
  {
    key: 'videoConference',
    type: 'boolean',
    effective: 'true',
    softwareDefault: 'true',
    configuredDefault: 'true',
    envSeed: null,
    envSeedState: null,
    requiresEnv: [
      { name: 'LIVEKIT_URL', state: 'set' },
      { name: 'LIVEKIT_API_SECRET', state: 'missing' },
    ],
    available: false,
  },
  {
    key: 'apiKeysEnabled',
    type: 'boolean',
    effective: 'false',
    softwareDefault: 'false',
    configuredDefault: 'true',
    envSeed: 'API_KEYS_ENABLED',
    envSeedState: 'set',
    requiresEnv: [],
    available: true,
  },
  {
    key: 'publicRegistration',
    type: 'boolean',
    effective: 'true',
    softwareDefault: 'false',
    configuredDefault: 'true',
    envSeed: 'PUBLIC_REGISTRATION',
    envSeedState: 'missing',
    requiresEnv: [],
    available: true,
  },
]

describe('admin/config.vue', () => {
  const mocks = { $t: (key) => key }

  const Wrapper = (policyConfig = SAMPLE) => {
    const wrapper = shallowMount(config, { mocks, localVue, stubs })
    wrapper.setData({ policyConfig })
    return wrapper
  }

  describe('helpers', () => {
    it('fmt parses JSON-encoded values', () => {
      expect(Wrapper().vm.fmt('true')).toBe('true')
      expect(Wrapper().vm.fmt('5')).toBe('5')
      expect(Wrapper().vm.fmt('not json')).toBe('not json')
    })

    it('seedSeverity is info when set, warn otherwise', () => {
      const vm = Wrapper().vm
      expect(vm.seedSeverity('set')).toBe('info')
      expect(vm.seedSeverity('missing')).toBe('warn')
    })
  })

  describe('required environment section', () => {
    it('flattens hard requirements and colours by state', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.requiredEnv).toHaveLength(2)
      const ok = wrapper.find('[data-test="config-required-LIVEKIT_URL"] .badge')
      const bad = wrapper.find('[data-test="config-required-LIVEKIT_API_SECRET"] .badge')
      expect(ok.classes()).toContain('badge--ok')
      expect(bad.classes()).toContain('badge--error')
    })
  })

  describe('env-seeded section', () => {
    it('lists keys with an envSeed and grades the seed presence', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.seeded.map((entry) => entry.key)).toEqual([
        'apiKeysEnabled',
        'publicRegistration',
      ])
      expect(wrapper.find('[data-test="config-seed-apiKeysEnabled"] .badge').classes()).toContain(
        'badge--info',
      )
      expect(
        wrapper.find('[data-test="config-seed-publicRegistration"] .badge').classes(),
      ).toContain('badge--warn')
    })
  })

  describe('software defaults section', () => {
    it('renders one muted row per policy key', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('[data-test^="config-software-"]')).toHaveLength(3)
      expect(wrapper.find('[data-test="config-software-videoConference"]').exists()).toBe(true)
    })
  })
})

import { shallowMount } from '@vue/test-utils'
import config from './config.vue'

const localVue = global.localVue

const stubs = { 'os-card': { template: '<div><slot /></div>' } }

// Covers every row shape: a policy with only hard requirements (no seed) + two secrets
// in different states, a seed whose admin override diverges from the env value, a seed
// whose env is unset (falls back to the software default), and an integer seed.
const SAMPLE = [
  {
    key: 'videoConference',
    type: 'boolean',
    effective: 'false',
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
  {
    key: 'inviteLinkLimit',
    type: 'integer',
    effective: '5',
    softwareDefault: '7',
    configuredDefault: '5',
    envSeed: 'INVITE_LINK_LIMIT',
    envSeedState: 'set',
    requiresEnv: [],
    available: true,
  },
]

describe('admin/config.vue', () => {
  const mocks = { $t: (key) => key }

  const Wrapper = async (policyConfig = SAMPLE) => {
    const wrapper = shallowMount(config, { mocks, localVue, stubs })
    await wrapper.setData({ policyConfig })
    return wrapper
  }

  const row = (wrapper, envKey) => wrapper.find(`[data-test="config-row-${envKey}"]`)

  describe('fmt helper', () => {
    it('parses JSON-encoded values, passing through non-JSON', async () => {
      const vm = (await Wrapper()).vm
      expect(vm.fmt('true')).toBe('true')
      expect(vm.fmt('5')).toBe('5')
      expect(vm.fmt('not json')).toBe('not json')
    })
  })

  describe('row flattening', () => {
    it('emits one row per env var: a seed row per seeded policy, one per required secret', async () => {
      const wrapper = await Wrapper()
      expect(wrapper.vm.rows.map((r) => r.envKey)).toEqual([
        'LIVEKIT_URL',
        'LIVEKIT_API_SECRET',
        'API_KEYS_ENABLED',
        'PUBLIC_REGISTRATION',
        'INVITE_LINK_LIMIT',
      ])
      expect(wrapper.findAll('[data-test^="config-row-"]')).toHaveLength(5)
    })

    it('anchors only the first row of each policy, so #<policyKey> has no duplicate id', async () => {
      const wrapper = await Wrapper()
      // videoConference has no seed → its first requirement carries the anchor.
      expect(row(wrapper, 'LIVEKIT_URL').attributes('id')).toBe('videoConference')
      expect(row(wrapper, 'LIVEKIT_API_SECRET').attributes('id')).toBeUndefined()
      expect(row(wrapper, 'API_KEYS_ENABLED').attributes('id')).toBe('apiKeysEnabled')
    })
  })

  describe('required secrets', () => {
    it('shows presence and does not flag a satisfied requirement', async () => {
      const url = row(await Wrapper(), 'LIVEKIT_URL')
      expect(url.find('[data-test="config-state-LIVEKIT_URL"]').classes()).toContain('badge--ok')
      expect(url.classes()).not.toContain('config-row--blocking')
      expect(url.find('.cell__blocks').exists()).toBe(false)
    })

    it('flags a missing requirement as blocking, naming the feature it breaks', async () => {
      const secret = row(await Wrapper(), 'LIVEKIT_API_SECRET')
      expect(secret.find('[data-test="config-state-LIVEKIT_API_SECRET"]').classes()).toContain(
        'badge--error',
      )
      expect(secret.classes()).toContain('config-row--blocking')
      expect(secret.find('.cell__blocks').exists()).toBe(true)
    })

    it('em-dashes the value columns of a secret (presence only, never a value)', async () => {
      const secret = row(await Wrapper(), 'LIVEKIT_API_SECRET')
      expect(secret.find('[data-test="config-override-LIVEKIT_API_SECRET"]').exists()).toBe(false)
      expect(secret.find('[data-test="config-envvalue-LIVEKIT_API_SECRET"]').exists()).toBe(false)
      expect(secret.findAll('.cell-empty')).toHaveLength(3)
    })
  })

  describe('seed vars', () => {
    it('shows the effective value, and the override only when it diverges from the default', async () => {
      const api = row(await Wrapper(), 'API_KEYS_ENABLED')
      // effective false, env-seed configured true → an admin override is present.
      expect(api.find('.cell--effective .value').text()).toBe('false')
      expect(api.find('[data-test="config-override-API_KEYS_ENABLED"]').text()).toBe('false')
      expect(api.find('[data-test="config-envvalue-API_KEYS_ENABLED"]').text()).toBe('true')
    })

    it('shows no override when the effective value equals the configured default', async () => {
      const pub = row(await Wrapper(), 'PUBLIC_REGISTRATION')
      expect(pub.find('.cell--effective .value').text()).toBe('true')
      expect(pub.find('[data-test="config-override-PUBLIC_REGISTRATION"]').exists()).toBe(false)
    })

    it('em-dashes the env value when the seed var is unset, with an accessible label', async () => {
      const pub = row(await Wrapper(), 'PUBLIC_REGISTRATION')
      expect(pub.find('[data-test="config-envvalue-PUBLIC_REGISTRATION"]').exists()).toBe(false)
      const empty = pub.find('.cell-empty')
      expect(empty.find('[aria-hidden="true"]').text()).toBe('—')
      expect(empty.find('.config-caption').text()).toBe('admin.config.notSet')
    })

    it('renders integer seeds through fmt (env value and software default)', async () => {
      const invite = row(await Wrapper(), 'INVITE_LINK_LIMIT')
      expect(invite.find('.cell--effective .value').text()).toBe('5')
      expect(invite.find('[data-test="config-envvalue-INVITE_LINK_LIMIT"]').text()).toBe('5')
      expect(invite.find('.cell--muted code').text()).toBe('7')
    })
  })
})

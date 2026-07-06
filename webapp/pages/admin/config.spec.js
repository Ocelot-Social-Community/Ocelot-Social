import { shallowMount } from '@vue/test-utils'
import config from './config.vue'

const localVue = global.localVue

const stubs = {
  'os-card': { template: '<div><slot /></div>' },
  'nuxt-link': { template: '<a :href="to"><slot /></a>', props: ['to'] },
}

// Covers every row shape the systemConfig query yields: a hard-requirement pair (a
// non-secret URL that is present + a secret that is missing → blocking), a seed whose
// admin override diverges from the env value, a seed whose env is unset (falls back to
// the software default), a plain non-secret infra var, and a plain secret. The backend
// returns rows already in the global category display order; the component preserves that
// row order (grouping by first appearance), so the fixture's category order IS the expected
// group order (canonical ordering itself is covered in systemConfig.spec.ts).
const SAMPLE = [
  {
    envKey: 'LIVEKIT_URL',
    category: 'video',
    secret: false,
    state: 'set',
    effective: null,
    override: null,
    envValue: 'wss://lk.example.org',
    softwareDefault: null,
    overridable: false,
    policyKey: 'videoConference',
    blocking: false,
  },
  {
    envKey: 'LIVEKIT_API_SECRET',
    category: 'video',
    secret: true,
    state: 'missing',
    effective: null,
    override: null,
    envValue: null,
    softwareDefault: null,
    overridable: false,
    policyKey: 'videoConference',
    blocking: true,
  },
  {
    envKey: 'API_KEYS_ENABLED',
    category: 'features',
    secret: false,
    state: 'set',
    effective: 'false',
    override: 'false',
    envValue: 'true',
    softwareDefault: 'false',
    overridable: true,
    policyKey: 'apiKeysEnabled',
    blocking: false,
  },
  {
    envKey: 'PUBLIC_REGISTRATION',
    category: 'registration',
    secret: false,
    state: 'missing',
    effective: 'true',
    override: null,
    envValue: null,
    softwareDefault: 'false',
    overridable: true,
    policyKey: 'publicRegistration',
    blocking: false,
  },
  {
    envKey: 'NEO4J_URI',
    category: 'database',
    secret: false,
    state: 'set',
    effective: 'bolt://db:7687',
    override: null,
    envValue: 'bolt://db:7687',
    softwareDefault: 'bolt://localhost:7687',
    overridable: false,
    policyKey: null,
    blocking: false,
  },
  {
    envKey: 'JWT_SECRET',
    category: 'auth',
    secret: true,
    state: 'set',
    effective: null,
    override: null,
    envValue: null,
    softwareDefault: null,
    overridable: false,
    policyKey: null,
    blocking: false,
  },
]

describe('admin/config.vue', () => {
  const mocks = { $t: (key) => key }

  const Wrapper = async (systemConfig = SAMPLE) => {
    const wrapper = shallowMount(config, { mocks, localVue, stubs })
    await wrapper.setData({ systemConfig })
    return wrapper
  }

  const row = (wrapper, envKey) => wrapper.find(`[data-test="config-row-${envKey}"]`)

  describe('fmt helper', () => {
    it('parses JSON-encoded values, passing through non-JSON', async () => {
      const vm = (await Wrapper()).vm
      expect(vm.fmt('true')).toBe('true')
      expect(vm.fmt('5')).toBe('5')
      expect(vm.fmt('bolt://db:7687')).toBe('bolt://db:7687')
    })

    it('renders a JSON list as a JS array literal (empty and set)', async () => {
      const vm = (await Wrapper()).vm
      expect(vm.fmt('[]')).toBe('[]')
      expect(vm.fmt('["m_a","m_b"]')).toBe("['m_a', 'm_b']")
    })
  })

  describe('grouping', () => {
    it('groups rows by category preserving the backend row order, dropping empty categories', async () => {
      const wrapper = await Wrapper()
      // The component no longer sorts — it renders groups in the order the backend rows
      // arrive (first appearance per category). Here that is the SAMPLE fixture's order.
      expect(wrapper.vm.groups.map((g) => g.category)).toEqual([
        'video',
        'features',
        'registration',
        'database',
        'auth',
      ])
      // Each present category renders a group tbody with its heading label.
      const video = wrapper.find('[data-test="config-group-video"]')
      expect(video.find('.config-group-head th').text()).toBe('admin.config.category.video')
    })

    it('keeps every env var (one row each) across the groups', async () => {
      const wrapper = await Wrapper()
      expect(wrapper.findAll('[data-test^="config-row-"]')).toHaveLength(6)
    })

    it('anchors only the first row of each policy, so #<policyKey> has no duplicate id', async () => {
      const wrapper = await Wrapper()
      // videoConference has no seed → its first requirement carries the anchor.
      expect(row(wrapper, 'LIVEKIT_URL').attributes('id')).toBe('videoConference')
      expect(row(wrapper, 'LIVEKIT_API_SECRET').attributes('id')).toBeUndefined()
      expect(row(wrapper, 'API_KEYS_ENABLED').attributes('id')).toBe('apiKeysEnabled')
      // A plain var has no policy → no anchor.
      expect(row(wrapper, 'NEO4J_URI').attributes('id')).toBeUndefined()
    })
  })

  describe('plain infrastructure var', () => {
    it('shows the effective value, env value and software default, with no override link', async () => {
      const neo4j = row(await Wrapper(), 'NEO4J_URI')
      expect(neo4j.find('.cell--effective .value').text()).toBe('bolt://db:7687')
      expect(neo4j.find('[data-test="config-envvalue-NEO4J_URI"]').text()).toBe('bolt://db:7687')
      expect(neo4j.find('.cell--muted code').text()).toBe('bolt://localhost:7687')
      expect(neo4j.find('[data-test="config-override-NEO4J_URI"]').exists()).toBe(false)
      // only the override column is em-dashed
      expect(neo4j.findAll('.cell-empty')).toHaveLength(1)
    })
  })

  describe('secrets', () => {
    it('shows a set secret as present-but-masked (never its value), with no default', async () => {
      const jwt = row(await Wrapper(), 'JWT_SECRET')
      // presence badge in the effective column
      expect(jwt.find('[data-test="config-state-JWT_SECRET"]').classes()).toContain('badge--ok')
      // env value: masked (marked as set), NOT "not set", and never the actual value
      const envValue = jwt.find('[data-test="config-envvalue-JWT_SECRET"]')
      expect(envValue.exists()).toBe(true)
      expect(envValue.classes()).toContain('value--masked')
      expect(envValue.text()).toContain('admin.config.secretHidden')
      // no override link; a secret has no software default → "no default", not "not set"
      expect(jwt.find('[data-test="config-override-JWT_SECRET"]').exists()).toBe(false)
      expect(jwt.text()).toContain('admin.config.noDefault')
      // only the override and software-default columns are em-dashed now
      expect(jwt.findAll('.cell-empty')).toHaveLength(2)
    })

    it('shows the software default of a secret that has one, while masking its env value', async () => {
      // A software default is a public code constant → shown even for a secret; only the
      // deployed env value stays masked. NEO4J_PASSWORD is the real-world case.
      const w = await Wrapper([
        {
          envKey: 'NEO4J_PASSWORD',
          category: 'database',
          secret: true,
          state: 'set',
          effective: null,
          override: null,
          envValue: null,
          softwareDefault: 'neo4j',
          overridable: false,
          policyKey: null,
          blocking: false,
        },
      ])
      const pw = row(w, 'NEO4J_PASSWORD')
      // env value masked (deployed secret withheld)
      expect(pw.find('.value--masked').exists()).toBe(true)
      // software default shown as a value, not "no default"
      expect(pw.find('.cell--muted code').text()).toBe('neo4j')
      expect(pw.text()).not.toContain('admin.config.noDefault')
    })

    it('em-dashes (does not mask) a secret that is missing', async () => {
      const secret = row(await Wrapper(), 'LIVEKIT_API_SECRET')
      expect(secret.find('[data-test="config-state-LIVEKIT_API_SECRET"]').classes()).toContain(
        'badge--error',
      )
      // no masked value for a missing secret — the env-value column is em-dashed
      expect(secret.find('[data-test="config-envvalue-LIVEKIT_API_SECRET"]').exists()).toBe(false)
      expect(secret.find('.value--masked').exists()).toBe(false)
    })

    it('renders an EMPTY var as its own state (distinct label from missing), still flagged', async () => {
      // The backend distinguishes set | empty | missing (an env var present but ''
      // vs. absent). The badge is binary (only 'set' is ok), but the label must stay
      // three-way so an empty value is not conflated with a missing one.
      const w = await Wrapper([
        {
          envKey: 'LIVEKIT_API_SECRET',
          category: 'video',
          secret: true,
          state: 'empty',
          effective: null,
          override: null,
          envValue: null,
          softwareDefault: null,
          overridable: false,
          policyKey: 'videoConference',
          blocking: true,
        },
      ])
      const badge = row(w, 'LIVEKIT_API_SECRET').find(
        '[data-test="config-state-LIVEKIT_API_SECRET"]',
      )
      expect(badge.classes()).toContain('badge--error')
      expect(badge.text()).toBe('admin.config.state.empty')
    })
  })

  describe('hard-requirement vars', () => {
    it('shows a present non-secret requirement value, without flagging it', async () => {
      const url = row(await Wrapper(), 'LIVEKIT_URL')
      expect(url.find('[data-test="config-state-LIVEKIT_URL"]').classes()).toContain('badge--ok')
      expect(url.find('[data-test="config-envvalue-LIVEKIT_URL"]').text()).toBe(
        'wss://lk.example.org',
      )
      expect(url.classes()).not.toContain('config-row--blocking')
      expect(url.find('.cell__blocks').exists()).toBe(false)
    })

    it('flags a missing secret requirement as blocking, naming the feature it breaks', async () => {
      const secret = row(await Wrapper(), 'LIVEKIT_API_SECRET')
      expect(secret.find('[data-test="config-state-LIVEKIT_API_SECRET"]').classes()).toContain(
        'badge--error',
      )
      expect(secret.classes()).toContain('config-row--blocking')
      expect(secret.find('.cell__blocks').exists()).toBe(true)
      expect(secret.find('[data-test="config-override-LIVEKIT_API_SECRET"]').exists()).toBe(false)
    })
  })

  describe('overridable policy seeds', () => {
    it('shows the diverging override value, linking to its policy on the policy tab', async () => {
      const api = row(await Wrapper(), 'API_KEYS_ENABLED')
      expect(api.find('.cell--effective .value').text()).toBe('false')
      const link = api.find('[data-test="config-override-API_KEYS_ENABLED"]')
      expect(link.text()).toBe('false')
      expect(link.attributes('href')).toBe('/admin/policy#apiKeysEnabled')
    })

    it('offers a "set override" link to the policy when no override diverges yet', async () => {
      const pub = row(await Wrapper(), 'PUBLIC_REGISTRATION')
      expect(pub.find('.cell--effective .value').text()).toBe('true')
      const link = pub.find('[data-test="config-override-PUBLIC_REGISTRATION"]')
      expect(link.exists()).toBe(true)
      expect(link.classes()).toContain('override-link--empty')
      expect(link.attributes('href')).toBe('/admin/policy#publicRegistration')
      expect(link.text()).toBe('admin.config.setOverride')
    })

    it('em-dashes the env value when the seed var is unset, with an accessible label', async () => {
      const pub = row(await Wrapper(), 'PUBLIC_REGISTRATION')
      expect(pub.find('[data-test="config-envvalue-PUBLIC_REGISTRATION"]').exists()).toBe(false)
      const empty = pub.find('.cell-empty')
      expect(empty.find('[aria-hidden="true"]').text()).toBe('—')
      expect(empty.find('.config-caption').text()).toBe('admin.config.notSet')
    })
  })

  describe('deep-link highlight from the policy/roles tabs', () => {
    // history-mode pushState doesn't update :target, so the anchored row is highlighted
    // from the route hash. A reactive $route exercises the hash watcher; attach to the
    // document so getElementById (the scroll target) resolves; jsdom has no scrollIntoView.
    let attached
    const mountWithRoute = async (hash, systemConfig = SAMPLE) => {
      const $route = localVue.observable({ hash })
      attached = shallowMount(config, {
        mocks: { ...mocks, $route },
        localVue,
        stubs,
        attachTo: document.body,
      })
      await attached.setData({ systemConfig })
      await attached.vm.$nextTick()
      return { w: attached, $route }
    }

    beforeEach(() => {
      window.HTMLElement.prototype.scrollIntoView = jest.fn()
    })
    afterEach(() => {
      attached?.destroy()
      attached = undefined
    })

    it('highlights and scrolls to the anchored row matching the route hash', async () => {
      const { w } = await mountWithRoute('#apiKeysEnabled')
      expect(w.vm.highlightedKey).toBe('apiKeysEnabled')
      expect(row(w, 'API_KEYS_ENABLED').classes()).toContain('config-row--highlight')
      expect(row(w, 'NEO4J_URI').classes()).not.toContain('config-row--highlight')
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    })

    it('highlights the anchored (first) row of a policy with only hard requirements', async () => {
      // videoConference has no seed → its first requirement (LIVEKIT_URL) carries the anchor.
      const { w } = await mountWithRoute('#videoConference')
      expect(w.vm.highlightedKey).toBe('videoConference')
      expect(row(w, 'LIVEKIT_URL').classes()).toContain('config-row--highlight')
      expect(row(w, 'LIVEKIT_API_SECRET').classes()).not.toContain('config-row--highlight')
    })

    it('highlights nothing for an unknown or empty hash', async () => {
      const { w } = await mountWithRoute('#nonsense')
      expect(w.vm.highlightedKey).toBeNull()
      expect(w.find('.config-row--highlight').exists()).toBe(false)
      expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
    })

    it('re-evaluates the highlight when the hash changes without a remount', async () => {
      const { w, $route } = await mountWithRoute('')
      expect(w.vm.highlightedKey).toBeNull()
      $route.hash = '#publicRegistration'
      await w.vm.$nextTick()
      expect(w.vm.highlightedKey).toBe('publicRegistration')
      expect(row(w, 'PUBLIC_REGISTRATION').classes()).toContain('config-row--highlight')
    })

    it('fades the highlight out after a delay (clears the key so the class drops)', async () => {
      // Fake only the timers; keep setImmediate real so setData/nextTick still settle.
      jest.useFakeTimers({ doNotFake: ['setImmediate'] })
      const { w } = await mountWithRoute('#apiKeysEnabled')
      expect(w.vm.highlightedKey).toBe('apiKeysEnabled')
      jest.advanceTimersByTime(2500)
      expect(w.vm.highlightedKey).toBeNull()
      await w.vm.$nextTick()
      expect(row(w, 'API_KEYS_ENABLED').classes()).not.toContain('config-row--highlight')
      jest.useRealTimers()
    })
  })

  describe('value truncation', () => {
    // refreshTruncation() decides interactivity from real geometry (whether a cell is
    // clipped by its column), not a character count. jsdom has no layout, so stub
    // scrollWidth/clientWidth to simulate a clipped vs. fitting cell.
    const setWidths = (el, scroll, client) => {
      Object.defineProperty(el, 'scrollWidth', { value: scroll, configurable: true })
      Object.defineProperty(el, 'clientWidth', { value: client, configurable: true })
    }

    it('always keeps the full value in the DOM regardless of column width', async () => {
      const LONG = 'https://s3.eu-central-1.example.com/some/very/long/endpoint'
      const w = await Wrapper([
        {
          envKey: 'AWS_ENDPOINT',
          category: 'storage',
          secret: false,
          state: 'set',
          effective: LONG,
          override: null,
          envValue: LONG,
          softwareDefault: null,
          overridable: false,
          policyKey: null,
          blocking: false,
        },
      ])
      const code = w.find('[data-test="config-envvalue-AWS_ENDPOINT"]')
      expect(code.classes()).toContain('truncate')
      expect(code.text()).toBe(LONG)
    })

    it('flags the clipped value cell for a tooltip: is-clipped, focusable, data-full', async () => {
      const w = await Wrapper()
      const code = row(w, 'NEO4J_URI').find('[data-test="config-envvalue-NEO4J_URI"]')
      // simulate the fixed column clipping the value, then re-measure
      setWidths(code.element, 500, 100)
      w.vm.refreshTruncation()
      // the CELL (not the clipped text) carries the tooltip affordance
      const cell = code.element.parentElement
      expect(cell.classList.contains('is-clipped')).toBe(true)
      expect(cell.getAttribute('tabindex')).toBe('0')
      expect(cell.getAttribute('data-full')).toBe('bolt://db:7687')
    })

    it('leaves a cell that fits non-interactive (no tooltip, not in the tab order)', async () => {
      const w = await Wrapper()
      const code = row(w, 'NEO4J_URI').find('[data-test="config-envvalue-NEO4J_URI"]')
      setWidths(code.element, 100, 100) // scrollWidth == clientWidth → fits
      w.vm.refreshTruncation()
      const cell = code.element.parentElement
      expect(cell.classList.contains('is-clipped')).toBe(false)
      expect(cell.getAttribute('data-full')).toBe(null)
      expect(cell.getAttribute('tabindex')).toBe(null)
    })

    it('coalesces a burst of resize events into a single re-measure per frame', async () => {
      const w = await Wrapper()
      const spy = jest.spyOn(w.vm, 'refreshTruncation')
      let frameCb
      const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        frameCb = cb
        return 7
      })
      w.vm.onResize() // schedules a frame
      w.vm.onResize() // frame already pending → coalesced, no second schedule
      expect(raf).toHaveBeenCalledTimes(1)
      frameCb() // run the frame
      expect(spy).toHaveBeenCalled()
      raf.mockRestore()
    })
  })
})

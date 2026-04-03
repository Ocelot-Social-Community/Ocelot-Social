import Vue from 'vue'
import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import ApiKeys from './api-keys.vue'

const localVue = global.localVue

// Override dateTime filter to avoid locale dependency
Vue.filter('dateTime', (value) => value || '')

describe('settings/api-keys.vue', () => {
  let wrapper, mocks
  const originalClipboard = navigator.clipboard

  const mutateMock = jest.fn()
  const refetchMock = jest.fn()

  afterEach(() => {
    if (wrapper) wrapper.destroy()
    Object.assign(navigator, { clipboard: originalClipboard })
  })

  beforeEach(() => {
    mutateMock.mockReset()
    refetchMock.mockReset()

    mocks = {
      $t: jest.fn((key) => key),
      $env: { API_KEYS_MAX_PER_USER: 5 },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        mutate: mutateMock,
        queries: {
          myApiKeys: {
            refetch: refetchMock,
          },
        },
      },
    }
  })

  const activeKey = (overrides = {}) => ({
    id: 'k1',
    name: 'CI Bot',
    keyPrefix: 'oak_abc12345',
    createdAt: '2026-04-01T00:00:00Z',
    lastUsedAt: '2026-04-02T10:00:00Z',
    expiresAt: null,
    disabled: false,
    disabledAt: null,
    ...overrides,
  })

  const revokedKey = (overrides = {}) => ({
    id: 'k-revoked',
    name: 'Old Key',
    keyPrefix: 'oak_old12345',
    createdAt: '2025-01-01T00:00:00Z',
    lastUsedAt: '2025-05-01T00:00:00Z',
    expiresAt: null,
    disabled: true,
    disabledAt: '2025-06-01T00:00:00Z',
    ...overrides,
  })

  const Wrapper = (data = {}) => {
    return mount(ApiKeys, {
      mocks,
      localVue,
      stubs: {
        'nuxt-link': true,
        'confirm-modal': true,
        'date-time': { template: '<span>{{ dateTime }}</span>', props: ['dateTime'] },
      },
      data: () => ({
        myApiKeys: [],
        ...data,
      }),
    })
  }

  describe('renders', () => {
    it('shows create form', () => {
      wrapper = Wrapper()
      expect(wrapper.find('#api-key-name').exists()).toBe(true)
      expect(wrapper.find('#api-key-expiry').exists()).toBe(true)
    })

    it('shows empty state when no keys exist', () => {
      wrapper = Wrapper()
      expect(wrapper.text()).toContain('settings.api-keys.list.empty')
    })

    it('shows active key list', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      expect(wrapper.text()).toContain('CI Bot')
      expect(wrapper.text()).toContain('oak_abc12345')
    })

    it('shows key counter', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey(), activeKey({ id: 'k2', name: 'Key 2' })] })
      expect(wrapper.text()).toContain('(2/5)')
    })

    it('shows "never" for keys without lastUsedAt', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey({ lastUsedAt: null })] })
      expect(wrapper.text()).toContain('settings.api-keys.list.never')
    })

    it('shows "never-expires" for keys without expiresAt', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      expect(wrapper.text()).toContain('settings.api-keys.list.never-expires')
    })

    it('shows expired label for expired keys', () => {
      wrapper = Wrapper({
        myApiKeys: [activeKey({ expiresAt: '2020-01-01T00:00:00Z' })],
      })
      expect(wrapper.text()).toContain('settings.api-keys.list.expired')
    })
  })

  describe('revoked keys section', () => {
    it('is hidden when no revoked keys', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      expect(wrapper.find('.revoked-toggle').exists()).toBe(false)
    })

    it('shows toggle when revoked keys exist', () => {
      wrapper = Wrapper({ myApiKeys: [revokedKey()] })
      expect(wrapper.find('.revoked-toggle').exists()).toBe(true)
      expect(wrapper.text()).toContain('settings.api-keys.revoked-list.title')
    })

    it('is collapsed by default', () => {
      wrapper = Wrapper({ myApiKeys: [revokedKey()] })
      expect(wrapper.find('#revoked-keys-list').exists()).toBe(false)
    })

    it('expands on toggle click', async () => {
      wrapper = Wrapper({ myApiKeys: [revokedKey()] })
      await wrapper.find('.revoked-toggle').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('#revoked-keys-list').exists()).toBe(true)
      expect(wrapper.text()).toContain('Old Key')
    })

    it('shows revoked status label', async () => {
      wrapper = Wrapper({ myApiKeys: [revokedKey()] })
      await wrapper.find('.revoked-toggle').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('settings.api-keys.list.revoked')
    })
  })

  describe('computed properties', () => {
    it('activeKeys filters out disabled keys', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey(), revokedKey()] })
      expect(wrapper.vm.activeKeys).toHaveLength(1)
      expect(wrapper.vm.activeKeys[0].id).toBe('k1')
    })

    it('revokedKeys filters to disabled keys only', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey(), revokedKey()] })
      expect(wrapper.vm.revokedKeys).toHaveLength(1)
      expect(wrapper.vm.revokedKeys[0].id).toBe('k-revoked')
    })

    it('maxKeys reads from $env', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.maxKeys).toBe(5)
    })
  })

  describe('create key', () => {
    beforeEach(() => {
      mutateMock.mockResolvedValue({
        data: {
          createApiKey: {
            apiKey: activeKey({ id: 'new-key', name: 'My Key' }),
            secret: 'oak_fullsecretkey123',
          },
        },
      })
    })

    it('submit button is disabled when name is empty', () => {
      wrapper = Wrapper()
      const submitBtn = wrapper.find('button[type="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('submit button is disabled when limit reached', async () => {
      const keys = Array.from({ length: 5 }, (_, i) => activeKey({ id: `k${i}`, name: `Key ${i}` }))
      wrapper = Wrapper({ myApiKeys: keys })
      await wrapper.setData({ name: 'New Key' })
      const submitBtn = wrapper.find('button[type="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('shows limit warning when max keys reached', () => {
      const keys = Array.from({ length: 5 }, (_, i) => activeKey({ id: `k${i}`, name: `Key ${i}` }))
      wrapper = Wrapper({ myApiKeys: keys })
      expect(wrapper.text()).toContain('settings.api-keys.create.limit-reached')
    })

    it('does not show limit warning when under limit', () => {
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      expect(wrapper.text()).not.toContain('settings.api-keys.create.limit-reached')
    })

    it('does not count revoked keys toward the limit', async () => {
      const keys = [
        ...Array.from({ length: 4 }, (_, i) => activeKey({ id: `k${i}`, name: `Key ${i}` })),
        revokedKey(),
      ]
      wrapper = Wrapper({ myApiKeys: keys })
      await wrapper.setData({ name: 'New Key' })
      const submitBtn = wrapper.find('button[type="submit"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).not.toContain('settings.api-keys.create.limit-reached')
    })

    it('calls createApiKey mutation on submit', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledTimes(1)
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { name: 'My Key' },
        }),
      )
    })

    it('sends expiresInDays as number when selected', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'Expiring', expiresInDays: 30 })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { name: 'Expiring', expiresInDays: 30 },
        }),
      )
    })

    it('does not send expiresInDays when null', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'No Expiry', expiresInDays: null })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { name: 'No Expiry' },
        }),
      )
    })

    it('shows secret banner after creation', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.vm.newSecret).toBe('oak_fullsecretkey123')
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('settings.api-keys.secret.title')
    })

    it('refetches key list after creation', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(refetchMock).toHaveBeenCalled()
    })

    it('shows success toast', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mocks.$toast.success).toHaveBeenCalledWith('settings.api-keys.create.success')
    })

    it('resets form after creation', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: 'My Key', expiresInDays: 90 })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.vm.name).toBe('')
      expect(wrapper.vm.expiresInDays).toBeNull()
    })

    it('shows error toast on failure', async () => {
      mutateMock.mockRejectedValue(new Error('Maximum of 5 active API keys reached'))
      wrapper = Wrapper()
      await wrapper.setData({ name: 'Too Many' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Maximum of 5 active API keys reached')
    })

    it('does not submit when name is empty', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ name: '   ' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mutateMock).not.toHaveBeenCalled()
    })

    it('sets creating to true during mutation', async () => {
      let resolveMutate
      mutateMock.mockReturnValue(
        new Promise((resolve) => {
          resolveMutate = resolve
        }),
      )
      wrapper = Wrapper()
      await wrapper.setData({ name: 'Loading Test' })
      const submitPromise = wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.creating).toBe(true)
      resolveMutate({
        data: {
          createApiKey: {
            apiKey: activeKey({ id: 'new', name: 'Loading Test' }),
            secret: 'oak_secret',
          },
        },
      })
      await submitPromise
      await flushPromises()
      expect(wrapper.vm.creating).toBe(false)
    })
  })

  describe('copy secret', () => {
    it('copies secret to clipboard on success', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
      })
      wrapper = Wrapper()
      await wrapper.setData({ newSecret: 'oak_mysecret123' })
      await wrapper.vm.copySecret()
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('oak_mysecret123')
      expect(mocks.$toast.success).toHaveBeenCalledWith('settings.api-keys.secret.copied')
    })

    it('shows error toast when clipboard fails', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
      })
      wrapper = Wrapper()
      await wrapper.setData({ newSecret: 'oak_mysecret123' })
      await wrapper.vm.copySecret()
      expect(mocks.$toast.error).toHaveBeenCalledWith('settings.api-keys.secret.copy-failed')
    })
  })

  describe('revoke key', () => {
    it('opens confirm modal', async () => {
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      await wrapper.find('button[aria-label="settings.api-keys.list.revoke"]').trigger('click')
      expect(wrapper.vm.showRevokeModal).toBe(true)
      expect(wrapper.vm.revokeModalData.messageParams.name).toBe('CI Bot')
    })

    it('calls revokeApiKey mutation and refetches', async () => {
      mutateMock.mockResolvedValue({ data: { revokeApiKey: true } })
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      await wrapper.vm.revokeKey({ id: 'k1', name: 'CI Bot' })
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 'k1' } }))
      expect(refetchMock).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalled()
    })

    it('sets revokingKeyId during mutation', async () => {
      let resolveMutate
      mutateMock.mockReturnValue(
        new Promise((resolve) => {
          resolveMutate = resolve
        }),
      )
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      const revokePromise = wrapper.vm.revokeKey({ id: 'k1', name: 'CI Bot' })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.revokingKeyId).toBe('k1')
      resolveMutate({ data: { revokeApiKey: true } })
      await revokePromise
      await flushPromises()
      expect(wrapper.vm.revokingKeyId).toBeNull()
    })

    it('shows error toast on revoke failure', async () => {
      mutateMock.mockRejectedValue(new Error('Network error'))
      wrapper = Wrapper({ myApiKeys: [activeKey()] })
      await expect(wrapper.vm.revokeKey({ id: 'k1', name: 'CI Bot' })).rejects.toThrow(
        'Network error',
      )
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')
    })
  })

  describe('isExpired', () => {
    it('returns true for past expiresAt', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.isExpired({ expiresAt: '2020-01-01T00:00:00Z' })).toBe(true)
    })

    it('returns false for future expiresAt', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.isExpired({ expiresAt: '2099-01-01T00:00:00Z' })).toBe(false)
    })

    it('returns false for null expiresAt', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.isExpired({ expiresAt: null })).toBeFalsy()
    })
  })
})

import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import ApiKeys from './api-keys.vue'

const localVue = global.localVue

describe('settings/api-keys.vue', () => {
  let wrapper, mocks

  const mutateMock = jest.fn()
  const refetchMock = jest.fn()

  beforeEach(() => {
    mutateMock.mockReset()
    refetchMock.mockReset()

    mocks = {
      $t: jest.fn((key) => key),
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

  const Wrapper = (data = {}) => {
    return mount(ApiKeys, {
      mocks,
      localVue,
      stubs: {
        'nuxt-link': true,
        'confirm-modal': true,
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

    it('shows key list when keys exist', () => {
      wrapper = Wrapper({
        myApiKeys: [
          {
            id: 'k1',
            name: 'CI Bot',
            keyPrefix: 'oak_abc12345',
            createdAt: '2026-04-01T00:00:00Z',
            lastUsedAt: null,
            expiresAt: null,
            disabled: false,
          },
        ],
      })
      expect(wrapper.text()).toContain('CI Bot')
      expect(wrapper.text()).toContain('oak_abc12345')
    })

    it('shows revoked label for disabled keys', () => {
      wrapper = Wrapper({
        myApiKeys: [
          {
            id: 'k1',
            name: 'Old Key',
            keyPrefix: 'oak_old12345',
            createdAt: '2026-01-01T00:00:00Z',
            lastUsedAt: null,
            expiresAt: null,
            disabled: true,
          },
        ],
      })
      expect(wrapper.text()).toContain('settings.api-keys.list.revoked')
    })
  })

  describe('create key', () => {
    beforeEach(() => {
      mutateMock.mockResolvedValue({
        data: {
          createApiKey: {
            apiKey: {
              id: 'new-key',
              name: 'My Key',
              keyPrefix: 'oak_newkey12',
              createdAt: '2026-04-02T00:00:00Z',
              expiresAt: null,
              disabled: false,
            },
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

    it('calls createApiKey mutation on submit', async () => {
      wrapper = Wrapper()
      wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledTimes(1)
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { name: 'My Key' },
        }),
      )
    })

    it('sends expiresInDays when expiry is selected', async () => {
      wrapper = Wrapper()
      wrapper.setData({ name: 'Expiring Key', expiresInDays: 30 })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { name: 'Expiring Key', expiresInDays: 30 },
        }),
      )
    })

    it('shows secret banner after creation', async () => {
      wrapper = Wrapper()
      wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.vm.newSecret).toBe('oak_fullsecretkey123')
      expect(wrapper.text()).toContain('settings.api-keys.secret.title')
    })

    it('refetches key list after creation', async () => {
      wrapper = Wrapper()
      wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(refetchMock).toHaveBeenCalled()
    })

    it('shows success toast after creation', async () => {
      wrapper = Wrapper()
      wrapper.setData({ name: 'My Key' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mocks.$toast.success).toHaveBeenCalledWith('settings.api-keys.create.success')
    })

    it('shows error toast on failure', async () => {
      mutateMock.mockRejectedValue(new Error('Maximum of 5 active API keys reached'))
      wrapper = Wrapper()
      wrapper.setData({ name: 'Too Many' })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Maximum of 5 active API keys reached')
    })

    it('resets form after creation', async () => {
      wrapper = Wrapper()
      wrapper.setData({ name: 'My Key', expiresInDays: 90 })
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.vm.name).toBe('')
      expect(wrapper.vm.expiresInDays).toBeNull()
    })
  })

  describe('revoke key', () => {
    it('opens confirm modal when revoke button is clicked', async () => {
      wrapper = Wrapper({
        myApiKeys: [
          {
            id: 'k1',
            name: 'To Revoke',
            keyPrefix: 'oak_revoke12',
            createdAt: '2026-04-01T00:00:00Z',
            lastUsedAt: null,
            expiresAt: null,
            disabled: false,
          },
        ],
      })
      await wrapper.find('button[aria-label="settings.api-keys.list.revoke"]').trigger('click')
      expect(wrapper.vm.showRevokeModal).toBe(true)
      expect(wrapper.vm.revokeModalData).toBeTruthy()
      expect(wrapper.vm.revokeModalData.messageParams.name).toBe('To Revoke')
    })

    it('calls revokeApiKey mutation and refetches', async () => {
      mutateMock.mockResolvedValue({ data: { revokeApiKey: true } })
      wrapper = Wrapper({
        myApiKeys: [
          {
            id: 'k1',
            name: 'To Revoke',
            keyPrefix: 'oak_revoke12',
            createdAt: '2026-04-01T00:00:00Z',
            lastUsedAt: null,
            expiresAt: null,
            disabled: false,
          },
        ],
      })
      await wrapper.vm.revokeKey({ id: 'k1', name: 'To Revoke' })
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { id: 'k1' },
        }),
      )
      expect(refetchMock).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalled()
    })
  })

  describe('expired keys', () => {
    it('shows expired label for expired keys', () => {
      wrapper = Wrapper({
        myApiKeys: [
          {
            id: 'k-exp',
            name: 'Expired',
            keyPrefix: 'oak_expired1',
            createdAt: '2025-01-01T00:00:00Z',
            lastUsedAt: null,
            expiresAt: '2025-06-01T00:00:00Z',
            disabled: false,
          },
        ],
      })
      expect(wrapper.text()).toContain('settings.api-keys.list.expired')
    })
  })
})

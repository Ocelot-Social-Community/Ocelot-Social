import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import ApiKeys from './api-keys.vue'

const localVue = global.localVue

describe('admin/api-keys.vue', () => {
  let wrapper, mocks

  const mutateMock = jest.fn()
  const refetchMock = jest.fn()
  const queryMock = jest.fn()

  const sampleKeys = [
    {
      apiKey: {
        id: 'k1',
        name: 'CI Bot',
        keyPrefix: 'oak_cibot123',
        createdAt: '2026-03-01T00:00:00Z',
        lastUsedAt: '2026-04-01T12:00:00Z',
        expiresAt: null,
        disabled: false,
      },
      owner: { id: 'u1', name: 'Peter', slug: 'peter' },
      postsCount: 142,
      commentsCount: 891,
      lastContentAt: '2026-04-01T12:00:00Z',
    },
    {
      apiKey: {
        id: 'k2',
        name: 'Backup Script',
        keyPrefix: 'oak_backup12',
        createdAt: '2026-03-15T00:00:00Z',
        lastUsedAt: null,
        expiresAt: null,
        disabled: true,
      },
      owner: { id: 'u2', name: 'Maria', slug: 'maria' },
      postsCount: 5,
      commentsCount: 12,
      lastContentAt: '2026-03-20T00:00:00Z',
    },
  ]

  beforeEach(() => {
    mutateMock.mockReset()
    refetchMock.mockReset()
    queryMock.mockReset()

    mocks = {
      $t: jest.fn((key) => key),
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        mutate: mutateMock,
        query: queryMock,
        queries: {
          allApiKeys: {
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
        'pagination-buttons': true,
      },
      data: () => ({
        allApiKeys: [],
        ...data,
      }),
    })
  }

  describe('renders', () => {
    it('shows sort dropdown', () => {
      wrapper = Wrapper()
      expect(wrapper.find('#api-key-order').exists()).toBe(true)
    })

    it('shows empty state when no keys exist', () => {
      wrapper = Wrapper()
      expect(wrapper.text()).toContain('admin.api-keys.empty')
    })

    it('shows table when keys exist', () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      expect(wrapper.text()).toContain('CI Bot')
      expect(wrapper.text()).toContain('@peter')
      expect(wrapper.text()).toContain('142')
      expect(wrapper.text()).toContain('891')
    })

    it('shows revoked label for disabled keys', () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      expect(wrapper.text()).toContain('admin.api-keys.revoked')
    })

    it('does not show revoke buttons for disabled keys', () => {
      wrapper = Wrapper({
        allApiKeys: [sampleKeys[1]], // disabled key only
      })
      expect(
        wrapper.find('button[aria-label="admin.api-keys.revoke-key"]').exists(),
      ).toBe(false)
    })
  })

  describe('sort', () => {
    it('changes orderBy when sort dropdown changes', async () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      await wrapper.find('#api-key-order').setValue('POSTS_COUNT')
      expect(wrapper.vm.orderBy).toBe('POSTS_COUNT')
    })

    it('resets pagination when sort changes', async () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      wrapper.setData({ offset: 20 })
      await wrapper.find('#api-key-order').setValue('CREATED_AT')
      expect(wrapper.vm.offset).toBe(0)
    })
  })

  describe('detail view', () => {
    it('expands detail when clicking show-content button', async () => {
      queryMock.mockResolvedValue({
        data: {
          contentByApiKey: {
            posts: [{ id: 'p1', title: 'Test Post', slug: 'test', createdAt: '2026-04-01T00:00:00Z' }],
            comments: [],
          },
        },
      })
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      await wrapper.find('button[aria-label="admin.api-keys.show-content"]').trigger('click')
      await flushPromises()
      expect(wrapper.vm.expandedKeyId).toBe('k1')
      expect(wrapper.vm.detailContent).toBeTruthy()
      expect(wrapper.vm.detailContent.posts).toHaveLength(1)
    })

    it('collapses detail when clicking again', async () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      wrapper.setData({ expandedKeyId: 'k1', detailContent: { posts: [], comments: [] } })
      await wrapper.vm.toggleDetail('k1')
      expect(wrapper.vm.expandedKeyId).toBeNull()
    })
  })

  describe('revoke key', () => {
    it('opens confirm modal for single key revoke', async () => {
      wrapper = Wrapper({ allApiKeys: [sampleKeys[0]] })
      await wrapper.find('button[aria-label="admin.api-keys.revoke-key"]').trigger('click')
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.modalData.messageParams).toEqual({
        name: 'CI Bot',
        user: 'Peter',
      })
    })

    it('calls adminRevokeApiKey mutation', async () => {
      mutateMock.mockResolvedValue({ data: { adminRevokeApiKey: true } })
      wrapper = Wrapper({ allApiKeys: [sampleKeys[0]] })
      await wrapper.vm.revokeKey('k1')
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

  describe('revoke all keys', () => {
    it('opens confirm modal for bulk revoke', async () => {
      wrapper = Wrapper({ allApiKeys: [sampleKeys[0]] })
      await wrapper
        .find('button[aria-label="admin.api-keys.revoke-all"]')
        .trigger('click')
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.modalData.messageParams).toEqual({ user: 'Peter' })
    })

    it('calls adminRevokeUserApiKeys mutation', async () => {
      mutateMock.mockResolvedValue({ data: { adminRevokeUserApiKeys: 3 } })
      wrapper = Wrapper({ allApiKeys: [sampleKeys[0]] })
      await wrapper.vm.revokeAllKeys('u1', 'Peter')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { userId: 'u1' },
        }),
      )
      expect(refetchMock).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalledWith(
        'admin.api-keys.revoke-all-success',
      )
    })
  })

  describe('error handling', () => {
    it('shows error toast when revoke fails', async () => {
      mutateMock.mockRejectedValue(new Error('Network error'))
      wrapper = Wrapper({ allApiKeys: [sampleKeys[0]] })
      await wrapper.vm.revokeKey('k1')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')
    })

    it('shows error toast when detail query fails', async () => {
      queryMock.mockRejectedValue(new Error('Query failed'))
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      await wrapper.vm.toggleDetail('k1')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Query failed')
    })
  })

  describe('pagination', () => {
    it('next increments offset', () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      wrapper.vm.next()
      expect(wrapper.vm.offset).toBe(20)
    })

    it('back decrements offset', () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      wrapper.setData({ offset: 20 })
      wrapper.vm.back()
      expect(wrapper.vm.offset).toBe(0)
    })

    it('back does not go below 0', () => {
      wrapper = Wrapper({ allApiKeys: sampleKeys })
      wrapper.vm.back()
      expect(wrapper.vm.offset).toBe(0)
    })
  })
})

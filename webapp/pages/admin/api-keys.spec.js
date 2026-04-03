import Vue from 'vue'
import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import ApiKeys from './api-keys.vue'

const localVue = global.localVue

// Override dateTime filter to avoid locale dependency
Vue.filter('dateTime', (value) => value || '')

describe('admin/api-keys.vue', () => {
  let wrapper, mocks

  const mutateMock = jest.fn()
  const refetchMock = jest.fn()
  const queryMock = jest.fn()

  const userEntry = (overrides = {}) => ({
    user: { id: 'u1', name: 'Peter', slug: 'peter' },
    activeCount: 2,
    revokedCount: 1,
    postsCount: 42,
    commentsCount: 15,
    lastActivity: '2026-04-02T12:00:00Z',
    ...overrides,
  })

  const userEntryNeverUsed = () =>
    userEntry({
      user: { id: 'u2', name: 'Bob', slug: 'bob' },
      activeCount: 1,
      revokedCount: 0,
      postsCount: 0,
      commentsCount: 0,
      lastActivity: null,
    })

  const activeKeyDetail = (overrides = {}) => ({
    id: 'ak1',
    name: 'CI Bot',
    keyPrefix: 'oak_cibot123',
    createdAt: '2026-03-01T00:00:00Z',
    lastUsedAt: '2026-04-02T12:00:00Z',
    expiresAt: null,
    disabled: false,
    disabledAt: null,
    ...overrides,
  })

  const revokedKeyDetail = (overrides = {}) => ({
    id: 'ak-old',
    name: 'Old Script',
    keyPrefix: 'oak_old12345',
    createdAt: '2025-01-01T00:00:00Z',
    lastUsedAt: '2025-05-01T00:00:00Z',
    expiresAt: null,
    disabled: true,
    disabledAt: '2025-06-01T00:00:00Z',
    ...overrides,
  })

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
          apiKeyUsers: {
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
        'user-teaser': { template: '<span>@{{ user.slug }}</span>', props: ['user'] },
        'date-time': { template: '<span>{{ dateTime }}</span>', props: ['dateTime'] },
        'os-spinner': true,
      },
      data: () => ({
        apiKeyUsers: [],
        ...data,
      }),
    })
  }

  describe('renders', () => {
    it('shows title', () => {
      wrapper = Wrapper()
      expect(wrapper.text()).toContain('admin.api-keys.name')
    })

    it('shows empty state when no users', () => {
      wrapper = Wrapper()
      expect(wrapper.text()).toContain('admin.api-keys.empty')
    })

    it('shows user table', () => {
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      expect(wrapper.text()).toContain('@peter')
      expect(wrapper.text()).toContain('42')
      expect(wrapper.text()).toContain('15')
    })

    it('shows "never" for null lastActivity', () => {
      wrapper = Wrapper({ apiKeyUsers: [userEntryNeverUsed()] })
      expect(wrapper.text()).toContain('admin.api-keys.never')
    })

    it('shows revoke-all button only when active keys exist', () => {
      wrapper = Wrapper({
        apiKeyUsers: [userEntry({ activeCount: 0, revokedCount: 3 })],
      })
      expect(wrapper.find('button[aria-label="admin.api-keys.revoke-all"]').exists()).toBe(false)
    })

    it('shows revoke-all button when active keys exist', () => {
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      expect(wrapper.find('button[aria-label="admin.api-keys.revoke-all"]').exists()).toBe(true)
    })
  })

  describe('expand user detail', () => {
    it('loads keys on expand click', async () => {
      queryMock.mockResolvedValue({
        data: {
          apiKeysForUser: [activeKeyDetail(), revokedKeyDetail()],
        },
      })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.find('button[aria-label="admin.api-keys.show-keys"]').trigger('click')
      await flushPromises()
      expect(wrapper.vm.expandedUserId).toBe('u1')
      expect(wrapper.vm.userKeys).toHaveLength(2)
    })

    it('separates active and revoked keys', async () => {
      queryMock.mockResolvedValue({
        data: {
          apiKeysForUser: [activeKeyDetail(), revokedKeyDetail()],
        },
      })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.find('button[aria-label="admin.api-keys.show-keys"]').trigger('click')
      await flushPromises()
      expect(wrapper.vm.activeUserKeys).toHaveLength(1)
      expect(wrapper.vm.activeUserKeys[0].name).toBe('CI Bot')
      expect(wrapper.vm.revokedUserKeys).toHaveLength(1)
      expect(wrapper.vm.revokedUserKeys[0].name).toBe('Old Script')
    })

    it('collapses on second click', async () => {
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.setData({
        expandedUserId: 'u1',
        userKeys: [activeKeyDetail()],
      })
      await wrapper.vm.toggleUser('u1')
      expect(wrapper.vm.expandedUserId).toBeNull()
      expect(wrapper.vm.userKeys).toBeNull()
    })

    it('shows detail section with active keys heading', async () => {
      queryMock.mockResolvedValue({
        data: { apiKeysForUser: [activeKeyDetail()] },
      })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.vm.toggleUser('u1')
      await flushPromises()
      await wrapper.vm.$nextTick()
      await flushPromises()
      expect(wrapper.text()).toContain('admin.api-keys.detail.active')
      expect(wrapper.text()).toContain('CI Bot')
    })

    it('shows revoked keys heading in detail', async () => {
      queryMock.mockResolvedValue({
        data: { apiKeysForUser: [revokedKeyDetail()] },
      })
      wrapper = Wrapper({ apiKeyUsers: [userEntry({ activeCount: 0, revokedCount: 1 })] })
      await wrapper.vm.toggleUser('u1')
      await flushPromises()
      await wrapper.vm.$nextTick()
      await flushPromises()
      expect(wrapper.text()).toContain('admin.api-keys.detail.revoked')
    })

    it('shows error toast on query failure', async () => {
      queryMock.mockRejectedValue(new Error('Query failed'))
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.vm.toggleUser('u1')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Query failed')
    })

    it('discards stale response when user switches during load', async () => {
      let resolveFirst
      queryMock
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
        )
        .mockResolvedValueOnce({
          data: { apiKeysForUser: [activeKeyDetail({ id: 'ak-second', name: 'Second' })] },
        })
      wrapper = Wrapper({
        apiKeyUsers: [userEntry(), userEntry({ user: { id: 'u2', name: 'Bob', slug: 'bob' } })],
      })
      // Start loading user u1
      const firstToggle = wrapper.vm.toggleUser('u1')
      await wrapper.vm.$nextTick()
      // Switch to u2 before u1 finishes
      await wrapper.vm.toggleUser('u2')
      await flushPromises()
      // Now resolve u1's stale response
      resolveFirst({
        data: { apiKeysForUser: [activeKeyDetail({ id: 'ak-first', name: 'Stale' })] },
      })
      await firstToggle
      await flushPromises()
      // Should show u2's keys, not u1's stale response
      expect(wrapper.vm.expandedUserId).toBe('u2')
      expect(wrapper.vm.userKeys[0].name).toBe('Second')
    })

    it('sets detailLoading on the expand button', async () => {
      let resolveQuery
      queryMock.mockReturnValue(
        new Promise((resolve) => {
          resolveQuery = resolve
        }),
      )
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      const togglePromise = wrapper.vm.toggleUser('u1')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.detailLoading).toBe(true)
      resolveQuery({ data: { apiKeysForUser: [activeKeyDetail()] } })
      await togglePromise
      await flushPromises()
      expect(wrapper.vm.detailLoading).toBe(false)
    })
  })

  describe('revoke single key', () => {
    it('opens confirm modal', () => {
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      const key = activeKeyDetail()
      const entry = userEntry()
      wrapper.vm.confirmRevokeKey(key, entry)
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.modalData.messageParams).toEqual({
        name: 'CI Bot',
        user: 'Peter',
      })
    })

    it('calls adminRevokeApiKey and refetches', async () => {
      mutateMock.mockResolvedValue({ data: { adminRevokeApiKey: true } })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.vm.revokeKey('ak1', 'u1')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 'ak1' } }))
      expect(refetchMock).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalled()
    })

    it('collapses detail after revoke', async () => {
      mutateMock.mockResolvedValue({ data: { adminRevokeApiKey: true } })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.setData({ expandedUserId: 'u1' })
      await wrapper.vm.revokeKey('ak1', 'u1')
      await flushPromises()
      expect(wrapper.vm.expandedUserId).toBeNull()
    })

    it('shows error toast on failure', async () => {
      mutateMock.mockRejectedValue(new Error('Revoke failed'))
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.vm.revokeKey('ak1', 'u1')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Revoke failed')
    })
  })

  describe('revoke all keys', () => {
    it('opens confirm modal', () => {
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      wrapper.vm.confirmRevokeAll(userEntry())
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.modalData.messageParams).toEqual({ user: 'Peter' })
    })

    it('calls adminRevokeUserApiKeys and refetches', async () => {
      mutateMock.mockResolvedValue({ data: { adminRevokeUserApiKeys: 2 } })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.vm.revokeAllKeys('u1', 'Peter')
      await flushPromises()
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { userId: 'u1' } }),
      )
      expect(refetchMock).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalledWith('admin.api-keys.revoke-all-success')
    })

    it('collapses detail and clears keys after bulk revoke', async () => {
      mutateMock.mockResolvedValue({ data: { adminRevokeUserApiKeys: 2 } })
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.setData({ expandedUserId: 'u1', userKeys: [activeKeyDetail()] })
      await wrapper.vm.revokeAllKeys('u1', 'Peter')
      await flushPromises()
      expect(wrapper.vm.expandedUserId).toBeNull()
      expect(wrapper.vm.userKeys).toBeNull()
    })

    it('shows error toast on failure', async () => {
      mutateMock.mockRejectedValue(new Error('Bulk revoke failed'))
      wrapper = Wrapper({ apiKeyUsers: [userEntry()] })
      await wrapper.vm.revokeAllKeys('u1', 'Peter')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Bulk revoke failed')
    })
  })

  describe('pagination', () => {
    it('next increments offset', () => {
      wrapper = Wrapper()
      wrapper.vm.next()
      expect(wrapper.vm.offset).toBe(20)
    })

    it('back decrements offset', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ offset: 20 })
      wrapper.vm.back()
      expect(wrapper.vm.offset).toBe(0)
    })

    it('back does not go below 0', () => {
      wrapper = Wrapper()
      wrapper.vm.back()
      expect(wrapper.vm.offset).toBe(0)
    })

    it('hasPrevious is false at offset 0', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.hasPrevious).toBe(false)
    })

    it('hasPrevious is true at offset > 0', async () => {
      wrapper = Wrapper()
      await wrapper.setData({ offset: 20 })
      expect(wrapper.vm.hasPrevious).toBe(true)
    })

    it('sets hasNext to true when more results than pageSize', () => {
      wrapper = Wrapper()
      const entries = Array.from({ length: 21 }, (_, i) =>
        userEntry({ user: { id: `u${i}`, name: `User ${i}`, slug: `user-${i}` } }),
      )
      const updateFn = wrapper.vm.$options.apollo.apiKeyUsers.update.bind(wrapper.vm)
      const result = updateFn({ apiKeyUsers: entries })
      expect(wrapper.vm.hasNext).toBe(true)
      expect(result).toHaveLength(20)
    })

    it('sets hasNext to false when results fit in page', () => {
      wrapper = Wrapper()
      const entries = [userEntry()]
      const updateFn = wrapper.vm.$options.apollo.apiKeyUsers.update.bind(wrapper.vm)
      const result = updateFn({ apiKeyUsers: entries })
      expect(wrapper.vm.hasNext).toBe(false)
      expect(result).toHaveLength(1)
    })
  })
})

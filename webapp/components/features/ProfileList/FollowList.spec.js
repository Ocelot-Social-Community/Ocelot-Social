import { shallowMount } from '@vue/test-utils'
import FollowList from './FollowList.vue'

const localVue = global.localVue

const stubs = {
  'infinite-scroll-list': { template: '<div><slot /></div>' },
  'user-teaser': { template: '<div class="user-teaser"></div>' },
}

const fakeUser = (id) => ({ id, name: `User ${id}`, slug: `user-${id}` })
const fakeUsers = (n) => Array.from({ length: n }, (_, i) => fakeUser(`u${i + 1}`))

const mockApollo = {
  query: jest.fn(),
}

const defaultProps = {
  userId: 'user-1',
  userName: 'Jenny Rostock',
  type: 'following',
}

describe('FollowList.vue', () => {
  const Wrapper = (customProps = {}, queryResult = null) => {
    const result = queryResult ?? {
      data: {
        User: [{ id: 'user-1', following: fakeUsers(5), followingCount: 5 }],
      },
    }
    mockApollo.query.mockResolvedValue(result)

    return shallowMount(FollowList, {
      propsData: { ...defaultProps, ...customProps },
      mocks: {
        $t: jest.fn((str) => str),
        $filters: { truncate: jest.fn((s) => s) },
        $apollo: mockApollo,
        $toast: { error: jest.fn() },
        $i18n: { locale: jest.fn(() => 'de') },
      },
      stubs,
      localVue,
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('computed', () => {
    it('hasConnections returns false when connections is empty', () => {
      const wrapper = Wrapper()
      wrapper.setData({ connections: [], loadingConnections: false })
      expect(wrapper.vm.hasConnections).toBe(false)
    })

    it('hasConnections returns true when connections has entries', () => {
      const wrapper = Wrapper()
      wrapper.setData({ connections: fakeUsers(3) })
      expect(wrapper.vm.hasConnections).toBe(true)
    })

    it('listTitle uses truncated userName and type translation key', () => {
      const wrapper = Wrapper()
      wrapper.vm.$filters.truncate.mockReturnValue('Jenny')
      expect(wrapper.vm.listTitle).toContain('profile.network.following')
    })

    it('nobodyMessage uses type-specific translation key', () => {
      const wrapper = Wrapper({ type: 'followedBy' })
      expect(wrapper.vm.nobodyMessage).toContain('profile.network.followedByNobody')
    })
  })

  describe('loadConnections', () => {
    it('resets state and loads first page on offset=0', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      expect(mockApollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { id: 'user-1', first: 25, offset: 0 },
        }),
      )
    })

    it('populates connections from query result', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.connections).toHaveLength(5)
    })

    it('sets allLoaded=true when fewer than PAGE_SIZE items returned', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.allLoaded).toBe(true)
    })

    it('deduplicates connections by id', async () => {
      const u = fakeUser('u1')
      const wrapper = Wrapper(
        {},
        { data: { User: [{ id: 'user-1', following: [u, { ...u }], followingCount: 2 }] } },
      )
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.connections).toHaveLength(1)
    })

    it('uses offset when loading more', async () => {
      mockApollo.query
        .mockResolvedValueOnce({
          data: { User: [{ id: 'user-1', following: fakeUsers(25), followingCount: 30 }] },
        })
        .mockResolvedValueOnce({
          data: { User: [{ id: 'user-1', following: fakeUsers(5), followingCount: 30 }] },
        })

      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadMore()
      await wrapper.vm.$nextTick()

      expect(mockApollo.query).toHaveBeenCalledTimes(2)
      expect(mockApollo.query).toHaveBeenLastCalledWith(
        expect.objectContaining({
          variables: { id: 'user-1', first: 25, offset: 25 },
        }),
      )
    })
  })

  describe('loadMore', () => {
    it('is a no-op when allLoaded=true', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      jest.clearAllMocks()

      wrapper.setData({ allLoaded: true })
      await wrapper.vm.loadMore()
      expect(mockApollo.query).not.toHaveBeenCalled()
    })

    it('is a no-op when loadingMore=true', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      jest.clearAllMocks()

      wrapper.setData({ loadingMore: true })
      await wrapper.vm.loadMore()
      expect(mockApollo.query).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('shows toast and resets loading flags on query error', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      mockApollo.query.mockRejectedValue(new Error('Network error'))
      await wrapper.vm.loadConnections(0)

      expect(wrapper.vm.$toast.error).toHaveBeenCalledWith('Network error')
      expect(wrapper.vm.loadingConnections).toBe(false)
      expect(wrapper.vm.loadingMore).toBe(false)
    })
  })

  describe('type=followedBy', () => {
    it('queries the followedBy field', async () => {
      const wrapper = Wrapper(
        { type: 'followedBy' },
        { data: { User: [{ id: 'user-1', followedBy: fakeUsers(3), followedByCount: 3 }] } },
      )
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.connections).toHaveLength(3)
    })
  })
})

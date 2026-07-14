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

    it('nobodyMessage returns followNoFilterResults when activeFilter has 3+ chars', () => {
      const wrapper = Wrapper()
      wrapper.setData({ activeFilter: 'abc' })
      expect(wrapper.vm.nobodyMessage).toBe('profile.network.followNoFilterResults')
    })
  })

  describe('isLoading', () => {
    it('is true when loadingConnections', () => {
      const wrapper = Wrapper()
      wrapper.setData({ loadingConnections: true, loadingMore: false })
      expect(wrapper.vm.isLoading).toBe(true)
    })

    it('is true when loadingMore', () => {
      const wrapper = Wrapper()
      wrapper.setData({ loadingConnections: false, loadingMore: true })
      expect(wrapper.vm.isLoading).toBe(true)
    })

    it('is false when neither loading', () => {
      const wrapper = Wrapper()
      wrapper.setData({ loadingConnections: false, loadingMore: false })
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('popoverEnabled', () => {
    it('is false when isScrolling', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: true,
        loadingConnections: false,
        loadingMore: false,
        loadingCooldown: false,
      })
      expect(wrapper.vm.popoverEnabled).toBe(false)
    })

    it('is false when isLoading', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: false,
        loadingConnections: true,
        loadingMore: false,
        loadingCooldown: false,
      })
      expect(wrapper.vm.popoverEnabled).toBe(false)
    })

    it('is false when loadingCooldown', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: false,
        loadingConnections: false,
        loadingMore: false,
        loadingCooldown: true,
      })
      expect(wrapper.vm.popoverEnabled).toBe(false)
    })

    it('is true when not scrolling, loading, or in cooldown', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: false,
        loadingConnections: false,
        loadingMore: false,
        loadingCooldown: false,
      })
      expect(wrapper.vm.popoverEnabled).toBe(true)
    })
  })

  describe('loadConnections', () => {
    it('resets state and loads first page on offset=0', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      expect(mockApollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ id: 'user-1', first: 25, offset: 0 }),
        }),
      )
    })

    it('sends empty nameFilter when activeFilter is shorter than 3 chars', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      mockApollo.query.mockClear()

      wrapper.setData({ activeFilter: 'ab' })
      await wrapper.vm.loadConnections(0)

      expect(mockApollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ nameFilter: '' }),
        }),
      )
    })

    it('sends activeFilter as nameFilter when 3+ chars', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      mockApollo.query.mockClear()

      wrapper.setData({ activeFilter: 'abc' })
      await wrapper.vm.loadConnections(0)

      expect(mockApollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ nameFilter: 'abc' }),
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

    it('deduplicates connections by id when appending', async () => {
      mockApollo.query
        .mockResolvedValueOnce({
          data: { User: [{ id: 'user-1', following: fakeUsers(25), followingCount: 30 }] },
        })
        .mockResolvedValueOnce({
          data: {
            User: [
              {
                id: 'user-1',
                following: [fakeUser('u1'), fakeUser('u26')],
                followingCount: 30,
              },
            ],
          },
        })

      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadMore()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.connections).toHaveLength(26)
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
          variables: expect.objectContaining({ id: 'user-1', first: 25, offset: 25 }),
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

    it('sets showFilter when connections.length >= PAGE_SIZE', async () => {
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

      expect(wrapper.vm.connections).toHaveLength(25)
      expect(wrapper.vm.showFilter).toBe(false)

      await wrapper.vm.loadMore()
      expect(wrapper.vm.showFilter).toBe(true)
    })

    it('does not set showFilter when connections.length < PAGE_SIZE', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      jest.clearAllMocks()

      wrapper.setData({ allLoaded: false, connections: fakeUsers(5) })
      mockApollo.query.mockResolvedValueOnce({
        data: { User: [{ id: 'user-1', following: [], followingCount: 5 }] },
      })

      await wrapper.vm.loadMore()
      expect(wrapper.vm.showFilter).toBe(false)
    })
  })

  describe('onFilterChange', () => {
    it('updates activeFilter and reloads from offset 0', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      mockApollo.query.mockClear()

      await wrapper.vm.onFilterChange('abc')

      expect(wrapper.vm.activeFilter).toBe('abc')
      expect(mockApollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ offset: 0, nameFilter: 'abc' }),
        }),
      )
    })
  })

  describe('onScrollingChange', () => {
    it('updates isScrolling', () => {
      const wrapper = Wrapper()
      wrapper.vm.onScrollingChange(true)
      expect(wrapper.vm.isScrolling).toBe(true)
      wrapper.vm.onScrollingChange(false)
      expect(wrapper.vm.isScrolling).toBe(false)
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

import { shallowMount } from '@vue/test-utils'
import GroupMemberList from './GroupMemberList.vue'

const localVue = global.localVue

const stubs = {
  'infinite-scroll-list': { template: '<div><slot /></div>' },
  'os-icon': true,
  'group-avatar': true,
}

const mockSubscription = { unsubscribe: jest.fn() }
const mockObserver = { subscribe: jest.fn(() => mockSubscription) }
const mockApollo = {
  query: jest.fn().mockResolvedValue({ data: { User: [{ id: 'user-1', groups: [] }] } }),
  subscribe: jest.fn().mockReturnValue(mockObserver),
  mutate: jest.fn(),
}

describe('GroupMemberList.vue', () => {
  const Wrapper = (props = {}, groups = []) => {
    const wrapper = shallowMount(GroupMemberList, {
      propsData: {
        userId: 'user-1',
        userName: 'Jenny Rostock',
        myProfile: false,
        ...props,
      },
      mocks: {
        $t: jest.fn((str) => str),
        $apollo: mockApollo,
        $toast: { error: jest.fn() },
        $i18n: { locale: jest.fn(() => 'de') },
      },
      stubs,
      localVue,
    })
    wrapper.setData({ groups, loadingGroups: false, allGroupsLoaded: true })
    return wrapper
  }

  describe('hasGroups', () => {
    it('returns false when groups is empty', () => {
      const wrapper = Wrapper({}, [])
      expect(wrapper.vm.hasGroups).toBe(false)
    })

    it('returns true when groups has entries', () => {
      const wrapper = Wrapper({}, [{ id: '1', groupType: 'public', myRole: 'usual' }])
      expect(wrapper.vm.hasGroups).toBe(true)
    })
  })

  describe('nobodyMessage', () => {
    it('returns profile.groups.nobody when no filter is active', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.nobodyMessage).toBe('profile.groups.nobody')
    })

    it('returns profile.groups.nobody when activeFilter has fewer than 3 chars', () => {
      const wrapper = Wrapper()
      wrapper.setData({ activeFilter: 'ab' })
      expect(wrapper.vm.nobodyMessage).toBe('profile.groups.nobody')
    })

    it('returns profile.groups.noFilterResults when activeFilter has 3+ chars', () => {
      const wrapper = Wrapper()
      wrapper.setData({ activeFilter: 'abc' })
      expect(wrapper.vm.nobodyMessage).toBe('profile.groups.noFilterResults')
    })
  })

  describe('isLoading', () => {
    it('is true when loadingGroups', () => {
      const wrapper = Wrapper()
      wrapper.setData({ loadingGroups: true, loadingMore: false })
      expect(wrapper.vm.isLoading).toBe(true)
    })

    it('is true when loadingMore', () => {
      const wrapper = Wrapper()
      wrapper.setData({ loadingGroups: false, loadingMore: true })
      expect(wrapper.vm.isLoading).toBe(true)
    })

    it('is false when neither loading', () => {
      const wrapper = Wrapper()
      wrapper.setData({ loadingGroups: false, loadingMore: false })
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('popoverEnabled', () => {
    it('is false when isScrolling', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: true,
        loadingGroups: false,
        loadingMore: false,
        loadingCooldown: false,
      })
      expect(wrapper.vm.popoverEnabled).toBe(false)
    })

    it('is false when isLoading', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: false,
        loadingGroups: true,
        loadingMore: false,
        loadingCooldown: false,
      })
      expect(wrapper.vm.popoverEnabled).toBe(false)
    })

    it('is false when loadingCooldown', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: false,
        loadingGroups: false,
        loadingMore: false,
        loadingCooldown: true,
      })
      expect(wrapper.vm.popoverEnabled).toBe(false)
    })

    it('is true when not scrolling, loading, or in cooldown', () => {
      const wrapper = Wrapper()
      wrapper.setData({
        isScrolling: false,
        loadingGroups: false,
        loadingMore: false,
        loadingCooldown: false,
      })
      expect(wrapper.vm.popoverEnabled).toBe(true)
    })
  })

  describe('groupsByType', () => {
    describe('when myProfile = true', () => {
      it('groups by groupType into public, closed, hidden', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: 'owner' },
          { id: '2', groupType: 'closed', myRole: 'usual' },
          { id: '3', groupType: 'hidden', myRole: 'admin' },
          { id: '4', groupType: 'public', myRole: 'usual' },
        ]
        const { groupsByType } = Wrapper({ myProfile: true }, groups).vm
        expect(groupsByType.public).toHaveLength(2)
        expect(groupsByType.closed).toHaveLength(1)
        expect(groupsByType.hidden).toHaveLength(1)
      })

      it('returns empty arrays for types without groups', () => {
        const groups = [{ id: '1', groupType: 'public', myRole: 'owner' }]
        const { groupsByType } = Wrapper({ myProfile: true }, groups).vm
        expect(groupsByType.closed).toHaveLength(0)
        expect(groupsByType.hidden).toHaveLength(0)
      })
    })

    describe('when myProfile = false', () => {
      it('puts groups with active membership (usual/admin/owner) into shared', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: 'usual' },
          { id: '2', groupType: 'closed', myRole: 'admin' },
          { id: '3', groupType: 'hidden', myRole: 'owner' },
        ]
        const { groupsByType } = Wrapper({ myProfile: false }, groups).vm
        expect(groupsByType.shared).toHaveLength(3)
        expect(groupsByType.other).toHaveLength(0)
      })

      it('puts groups with myRole = null into other', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: null },
          { id: '2', groupType: 'closed', myRole: null },
        ]
        const { groupsByType } = Wrapper({ myProfile: false }, groups).vm
        expect(groupsByType.shared).toHaveLength(0)
        expect(groupsByType.other).toHaveLength(2)
      })

      it('puts groups with myRole = pending into other, not shared', () => {
        const groups = [
          { id: '1', groupType: 'closed', myRole: 'pending' },
          { id: '2', groupType: 'public', myRole: 'usual' },
        ]
        const { groupsByType } = Wrapper({ myProfile: false }, groups).vm
        expect(groupsByType.shared).toHaveLength(1)
        expect(groupsByType.shared[0].id).toBe('2')
        expect(groupsByType.other).toHaveLength(1)
        expect(groupsByType.other[0].id).toBe('1')
      })

      it('correctly splits a mixed list', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: 'usual' },
          { id: '2', groupType: 'closed', myRole: null },
          { id: '3', groupType: 'hidden', myRole: 'pending' },
          { id: '4', groupType: 'public', myRole: 'owner' },
        ]
        const { groupsByType } = Wrapper({ myProfile: false }, groups).vm
        expect(groupsByType.shared.map((g) => g.id)).toEqual(['1', '4'])
        expect(groupsByType.other.map((g) => g.id)).toEqual(['2', '3'])
      })
    })
  })

  describe('toggleVisibility', () => {
    it('optimistically toggles showOnProfile and calls mutate', async () => {
      mockApollo.mutate.mockResolvedValue({})
      const group = { id: 'g1', groupType: 'public', myRole: 'usual', showOnProfile: true }
      const wrapper = Wrapper({}, [group])
      await wrapper.vm.toggleVisibility(group)
      expect(group.showOnProfile).toBe(false)
      expect(mockApollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { groupId: 'g1', showOnProfile: false },
        }),
      )
      expect(wrapper.vm._skipNextSubscriptionReload).toBe(true)
    })

    it('rolls back showOnProfile and resets _skipNextSubscriptionReload on error', async () => {
      mockApollo.mutate.mockRejectedValue(new Error('Server error'))
      const group = { id: 'g1', groupType: 'public', myRole: 'usual', showOnProfile: false }
      const wrapper = Wrapper({}, [group])
      await wrapper.vm.toggleVisibility(group)
      expect(group.showOnProfile).toBe(false)
      expect(wrapper.vm._skipNextSubscriptionReload).toBe(false)
      expect(wrapper.vm.$toast.error).toHaveBeenCalledWith('Server error')
    })
  })

  describe('typesWithGroups', () => {
    describe('when myProfile = false', () => {
      it('returns only "other" when viewer has no shared groups', () => {
        const groups = [{ id: '1', groupType: 'public', myRole: null }]
        expect(Wrapper({ myProfile: false }, groups).vm.typesWithGroups).toEqual(['other'])
      })

      it('returns only "shared" when all groups are shared', () => {
        const groups = [{ id: '1', groupType: 'public', myRole: 'usual' }]
        expect(Wrapper({ myProfile: false }, groups).vm.typesWithGroups).toEqual(['shared'])
      })

      it('returns ["shared", "other"] when both sections have groups', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: 'usual' },
          { id: '2', groupType: 'closed', myRole: null },
        ]
        expect(Wrapper({ myProfile: false }, groups).vm.typesWithGroups).toEqual([
          'shared',
          'other',
        ])
      })

      it('returns empty array when there are no groups', () => {
        expect(Wrapper({ myProfile: false }, []).vm.typesWithGroups).toEqual([])
      })
    })

    describe('when myProfile = true', () => {
      it('returns only the types that have groups', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: 'owner' },
          { id: '2', groupType: 'public', myRole: 'usual' },
        ]
        expect(Wrapper({ myProfile: true }, groups).vm.typesWithGroups).toEqual(['public'])
      })

      it('returns all three types when each has at least one group', () => {
        const groups = [
          { id: '1', groupType: 'public', myRole: 'owner' },
          { id: '2', groupType: 'closed', myRole: 'usual' },
          { id: '3', groupType: 'hidden', myRole: 'admin' },
        ]
        expect(Wrapper({ myProfile: true }, groups).vm.typesWithGroups).toEqual([
          'public',
          'closed',
          'hidden',
        ])
      })
    })
  })

  describe('v-if condition', () => {
    it('does not render when no groups, not myProfile, not loading, and showFilter=false', async () => {
      const wrapper = Wrapper({ myProfile: false }, [])
      wrapper.setData({ showFilter: false })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('div').exists()).toBe(false)
    })

    it('renders when showFilter=true even without groups', async () => {
      const wrapper = Wrapper({ myProfile: false }, [])
      wrapper.setData({ showFilter: true })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('div').exists()).toBe(true)
    })

    it('renders when myProfile=true even without groups', async () => {
      const wrapper = Wrapper({ myProfile: true }, [])
      wrapper.setData({ showFilter: false })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('div').exists()).toBe(true)
    })
  })

  describe('loadGroups', () => {
    it('sends empty nameFilter when activeFilter is shorter than 3 chars', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      mockApollo.query.mockClear()

      wrapper.setData({ activeFilter: 'ab' })
      await wrapper.vm.loadGroups(0)

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
      await wrapper.vm.loadGroups(0)

      expect(mockApollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ nameFilter: 'abc' }),
        }),
      )
    })

    it('replaces groups on offset=0 after data loads', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      mockApollo.query.mockResolvedValueOnce({
        data: {
          User: [{ id: 'user-1', groups: [{ id: 'g2', groupType: 'public', myRole: 'usual' }] }],
        },
      })
      await wrapper.vm.loadGroups(0)

      expect(wrapper.vm.groups).toHaveLength(1)
      expect(wrapper.vm.groups[0].id).toBe('g2')
    })

    it('appends groups on offset > 0', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.setData({ groups: [{ id: 'g1', groupType: 'public', myRole: 'usual' }] })
      mockApollo.query.mockResolvedValueOnce({
        data: {
          User: [{ id: 'user-1', groups: [{ id: 'g2', groupType: 'public', myRole: 'usual' }] }],
        },
      })
      await wrapper.vm.loadGroups(1)

      expect(wrapper.vm.groups).toHaveLength(2)
      expect(wrapper.vm.groups.map((g) => g.id)).toEqual(['g1', 'g2'])
    })
  })

  describe('loadMore', () => {
    it('sets showFilter when groups.length >= PAGE_SIZE', async () => {
      const groups = Array.from({ length: 25 }, (_, i) => ({
        id: `g${i}`,
        groupType: 'public',
        myRole: 'usual',
      }))
      const wrapper = Wrapper({}, groups)
      wrapper.setData({ allGroupsLoaded: false })

      mockApollo.query.mockResolvedValueOnce({
        data: { User: [{ id: 'user-1', groups: [] }] },
      })

      expect(wrapper.vm.showFilter).toBe(false)
      await wrapper.vm.loadMore()
      expect(wrapper.vm.showFilter).toBe(true)
    })

    it('does not set showFilter when groups.length < PAGE_SIZE', async () => {
      const groups = Array.from({ length: 5 }, (_, i) => ({
        id: `g${i}`,
        groupType: 'public',
        myRole: 'usual',
      }))
      const wrapper = Wrapper({}, groups)
      wrapper.setData({ allGroupsLoaded: false })

      mockApollo.query.mockResolvedValueOnce({
        data: { User: [{ id: 'user-1', groups: [] }] },
      })

      await wrapper.vm.loadMore()
      expect(wrapper.vm.showFilter).toBe(false)
    })

    it('is a no-op when allGroupsLoaded=true', async () => {
      const wrapper = Wrapper()
      mockApollo.query.mockClear()

      wrapper.setData({ allGroupsLoaded: true })
      await wrapper.vm.loadMore()
      expect(mockApollo.query).not.toHaveBeenCalled()
    })

    it('is a no-op when loadingMore=true', async () => {
      const wrapper = Wrapper()
      wrapper.setData({ allGroupsLoaded: false, loadingMore: true })
      mockApollo.query.mockClear()

      await wrapper.vm.loadMore()
      expect(mockApollo.query).not.toHaveBeenCalled()
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
})

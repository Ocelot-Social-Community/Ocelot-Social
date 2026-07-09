import { shallowMount } from '@vue/test-utils'
import GroupMemberList from './GroupMemberList.vue'

const localVue = global.localVue

const stubs = {
  'infinite-scroll-list': { template: '<div><slot /></div>' },
  'os-icon': true,
  'group-teaser': true,
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
})

import { shallowMount } from '@vue/test-utils'
import GroupPageMemberList from './GroupPageMemberList.vue'

const localVue = global.localVue

const stubs = {
  'infinite-scroll-list': { template: '<div><slot /></div>' },
  'user-avatar': true,
}

const makeQueryResult = (members) => ({
  data: {
    GroupMembers: members.map((m) => ({
      user: { id: m.id, name: m.name || m.id, slug: m.slug || m.id, avatar: null },
      membership: { role: m.role },
    })),
  },
})

const mockApollo = { query: jest.fn() }

describe('GroupPageMemberList.vue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApollo.query.mockResolvedValue(makeQueryResult([]))
  })

  const Wrapper = async (propsData = {}, data = {}) => {
    const wrapper = shallowMount(GroupPageMemberList, {
      propsData: { groupId: 'group-1', ...propsData },
      mocks: {
        $t: jest.fn((str) => str),
        $apollo: mockApollo,
        $toast: { error: jest.fn() },
      },
      stubs,
      localVue,
    })
    await wrapper.vm.$nextTick()
    if (Object.keys(data).length) wrapper.setData(data)
    return wrapper
  }

  describe('hasMembers', () => {
    it('returns false when members is empty', async () => {
      const wrapper = await Wrapper({}, { members: [] })
      expect(wrapper.vm.hasMembers).toBe(false)
    })

    it('returns true when members has entries', async () => {
      const wrapper = await Wrapper({}, { members: [{ id: '1', membershipRole: 'usual' }] })
      expect(wrapper.vm.hasMembers).toBe(true)
    })
  })

  describe('membersByRole', () => {
    it('groups owner, admin, and usual members into separate buckets', async () => {
      const wrapper = await Wrapper(
        {},
        {
          members: [
            { id: '1', membershipRole: 'owner' },
            { id: '2', membershipRole: 'admin' },
            { id: '3', membershipRole: 'usual' },
          ],
        },
      )
      const { membersByRole } = wrapper.vm
      expect(membersByRole.owner).toHaveLength(1)
      expect(membersByRole.admin).toHaveLength(1)
      expect(membersByRole.members).toHaveLength(1)
    })

    it('puts pending members in the members bucket', async () => {
      const wrapper = await Wrapper({}, { members: [{ id: '1', membershipRole: 'pending' }] })
      expect(wrapper.vm.membersByRole.members).toHaveLength(1)
      expect(wrapper.vm.membersByRole.owner).toHaveLength(0)
    })
  })

  describe('sectionsWithMembers', () => {
    it('returns only sections that have at least one member', async () => {
      const wrapper = await Wrapper(
        {},
        {
          members: [
            { id: '1', membershipRole: 'owner' },
            { id: '2', membershipRole: 'usual' },
          ],
        },
      )
      expect(wrapper.vm.sectionsWithMembers.map((s) => s.key)).toEqual(['owner', 'members'])
    })

    it('returns all three sections when all roles are present', async () => {
      const wrapper = await Wrapper(
        {},
        {
          members: [
            { id: '1', membershipRole: 'owner' },
            { id: '2', membershipRole: 'admin' },
            { id: '3', membershipRole: 'usual' },
          ],
        },
      )
      expect(wrapper.vm.sectionsWithMembers.map((s) => s.key)).toEqual([
        'owner',
        'admin',
        'members',
      ])
    })

    it('returns empty array when no members are loaded', async () => {
      const wrapper = await Wrapper({}, { members: [] })
      expect(wrapper.vm.sectionsWithMembers).toEqual([])
    })

    it('resolves a section label through the role-label rules', async () => {
      // $t echoes the key here, which is how "no translation" looks: the heading then falls
      // back to the role name itself rather than showing an i18n path.
      const wrapper = await Wrapper({}, { members: [{ id: '1', membershipRole: 'owner' }] })
      expect(wrapper.vm.$t).toHaveBeenCalledWith('group.roles.owner')
      expect(wrapper.vm.sectionsWithMembers[0].label).toBe('owner')
    })

    it('gives a role the group invented a section of its own, after the known ones', async () => {
      // Without this, a member whose role matches none of the known names was in no section
      // and therefore simply not listed.
      const wrapper = await Wrapper(
        {},
        {
          members: [
            { id: '1', membershipRole: 'owner' },
            { id: '2', membershipRole: 'moderator' },
            { id: '3', membershipRole: 'usual' },
            { id: '4', membershipRole: 'curator' },
          ],
        },
      )
      expect(wrapper.vm.sectionsWithMembers.map((section) => section.key)).toEqual([
        'owner',
        'members',
        'curator',
        'moderator',
      ])
      expect(wrapper.vm.sectionsWithMembers[2].members.map((m) => m.id)).toEqual(['4'])
      expect(wrapper.vm.sectionsWithMembers[2].label).toBe('curator')
    })

    it('keeps applicants with the members section', async () => {
      const wrapper = await Wrapper(
        {},
        {
          members: [
            { id: '1', membershipRole: 'usual' },
            { id: '2', membershipRole: 'pending' },
          ],
        },
      )
      expect(wrapper.vm.sectionsWithMembers.map((section) => section.key)).toEqual(['members'])
      expect(wrapper.vm.sectionsWithMembers[0].members).toHaveLength(2)
    })
  })

  describe('onLoadMore', () => {
    it('does nothing when loadingMore is true', async () => {
      const wrapper = await Wrapper({}, { loadingMore: true })
      const spy = jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onLoadMore()
      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when loadingInitial is true', async () => {
      const wrapper = await Wrapper({}, { loadingInitial: true })
      const spy = jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onLoadMore()
      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when allLoaded is true', async () => {
      const wrapper = await Wrapper({}, { allLoaded: true })
      const spy = jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onLoadMore()
      expect(spy).not.toHaveBeenCalled()
    })

    it('shows filter after first load-more when offset >= 25', async () => {
      const wrapper = await Wrapper(
        {},
        { offset: 25, showFilter: false, loadingInitial: false, allLoaded: false },
      )
      jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onLoadMore()
      expect(wrapper.vm.showFilter).toBe(true)
    })

    it('does not show filter when offset < 25', async () => {
      const wrapper = await Wrapper(
        {},
        { offset: 10, showFilter: false, loadingInitial: false, allLoaded: false },
      )
      jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onLoadMore()
      expect(wrapper.vm.showFilter).toBe(false)
    })

    it('calls loadMembers(false)', async () => {
      const wrapper = await Wrapper({}, { offset: 0, loadingInitial: false, allLoaded: false })
      const spy = jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onLoadMore()
      expect(spy).toHaveBeenCalledWith(false)
    })
  })

  describe('onFilterChange', () => {
    it('updates activeFilter and calls loadMembers(true)', async () => {
      const wrapper = await Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'loadMembers').mockResolvedValue()
      wrapper.vm.onFilterChange('alice')
      expect(wrapper.vm.activeFilter).toBe('alice')
      expect(spy).toHaveBeenCalledWith(true)
    })
  })

  describe('loadMembers', () => {
    it('resets members list when reset=true', async () => {
      const wrapper = await Wrapper(
        {},
        { members: [{ id: '1', membershipRole: 'usual' }], offset: 5 },
      )
      mockApollo.query.mockResolvedValueOnce(
        makeQueryResult([{ id: '2', name: 'New', role: 'owner' }]),
      )
      await wrapper.vm.loadMembers(true)
      expect(wrapper.vm.members).toHaveLength(1)
      expect(wrapper.vm.members[0].id).toBe('2')
      expect(wrapper.vm.offset).toBe(1)
    })

    it('accumulates members when reset=false', async () => {
      const wrapper = await Wrapper(
        {},
        {
          members: [{ id: '1', name: 'Existing', membershipRole: 'usual' }],
          offset: 1,
          loadingInitial: false,
        },
      )
      mockApollo.query.mockResolvedValueOnce(
        makeQueryResult([{ id: '2', name: 'New', role: 'usual' }]),
      )
      await wrapper.vm.loadMembers(false)
      expect(wrapper.vm.members).toHaveLength(2)
      expect(wrapper.vm.members[1].id).toBe('2')
    })

    it('sets allLoaded when fewer than 25 members are returned', async () => {
      const wrapper = await Wrapper({}, { loadingInitial: false })
      mockApollo.query.mockResolvedValueOnce(
        makeQueryResult([{ id: '1', name: 'Only', role: 'usual' }]),
      )
      await wrapper.vm.loadMembers(true)
      expect(wrapper.vm.allLoaded).toBe(true)
    })

    it('maps membershipRole from membership.role', async () => {
      const wrapper = await Wrapper()
      mockApollo.query.mockResolvedValueOnce(
        makeQueryResult([{ id: '1', name: 'Owner', role: 'owner' }]),
      )
      await wrapper.vm.loadMembers(true)
      expect(wrapper.vm.members[0].membershipRole).toBe('owner')
    })
  })
})

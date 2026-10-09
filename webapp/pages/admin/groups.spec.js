import { mount } from '@vue/test-utils'

import groups from './groups.vue'

const localVue = global.localVue

const GROUPS = [
  {
    id: 'g1',
    slug: 'yoga',
    name: 'Yoga',
    visibility: 'public',
    disabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    membersCount: 12,
    ownerCount: 1,
  },
  {
    id: 'g2',
    slug: 'orphan',
    name: 'Orphaned Group',
    visibility: 'closed',
    disabled: false,
    createdAt: '2026-01-02T00:00:00.000Z',
    membersCount: 3,
    // Zero owners is legal and is what an admin comes here to fix.
    ownerCount: 0,
  },
  {
    id: 'g3',
    slug: 'silent',
    name: 'Disabled Group',
    visibility: 'hidden',
    disabled: true,
    createdAt: '2026-01-03T00:00:00.000Z',
    // The viewer may not see this one's member list.
    membersCount: null,
    ownerCount: null,
  },
]

const stubs = {
  'os-card': { template: '<div><slot /></div>' },
  'os-button': {
    template: '<button :disabled="disabled" v-on="$listeners"><slot /></button>',
    props: ['disabled'],
  },
  'nuxt-link': { template: '<a><slot /></a>', props: ['to'] },
}

describe('admin/groups.vue', () => {
  let mocks
  let refetch

  beforeEach(() => {
    refetch = jest.fn().mockResolvedValue({})
    mocks = {
      $t: jest.fn((key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)),
      $toast: { error: jest.fn(), success: jest.fn() },
      $apollo: { queries: { adminGroups: { refetch } } },
      localVue,
    }
  })

  const at = (wrapper, testId) => wrapper.find(`[data-test="${testId}"]`)

  const Wrapper = async (rows = GROUPS, total = rows.length) => {
    const wrapper = mount(groups, { localVue, mocks, stubs })
    wrapper.setData({ groups: rows, total })
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('lists the groups with their counts', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'group-table').exists()).toBe(true)
    expect(at(wrapper, 'group-g1').text()).toContain('Yoga')
    expect(at(wrapper, 'group-g1').text()).toContain('12')
  })

  it('marks a group without an owner and links where a new one is appointed', async () => {
    const wrapper = await Wrapper()

    const link = at(wrapper, 'appoint-owner-g2')
    expect(link.exists()).toBe(true)
    expect(link.props('to')).toBe('/groups/edit/g2/members')
    // A group that has an owner shows the count instead of the warning.
    expect(at(wrapper, 'appoint-owner-g1').exists()).toBe(false)
  })

  it('renders a dash where the viewer may not count the members', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'group-g3').text()).toContain('–')
  })

  it('says so when nothing matches', async () => {
    const wrapper = await Wrapper([], 0)

    expect(at(wrapper, 'empty').exists()).toBe(true)
    expect(at(wrapper, 'group-table').exists()).toBe(false)
  })

  describe('filters', () => {
    it('sends only the flags that are switched on', async () => {
      // `false` would mean "only groups that are NOT disabled", which is a different question
      // from "all of them" — so an unchecked box must send null, not false.
      const wrapper = await Wrapper()

      expect(wrapper.vm.variables).toMatchObject({
        search: null,
        visibility: null,
        ownerless: null,
        disabled: null,
      })

      wrapper.setData({
        groupFilter: { search: 'yoga', visibility: 'closed', ownerless: true, disabled: true },
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.variables).toMatchObject({
        search: 'yoga',
        visibility: 'closed',
        ownerless: true,
        disabled: true,
      })
    })

    it('goes back to the first page when a filter changes, through the variables alone', async () => {
      const wrapper = await Wrapper()
      wrapper.setData({ offset: 50 })

      await at(wrapper, 'filter-ownerless').trigger('change')

      expect(wrapper.vm.offset).toBe(0)
      // The reactive variables re-run the query; a refetch on top would ask twice.
      expect(wrapper.vm.variables).toMatchObject({ offset: 0 })
      expect(refetch).not.toHaveBeenCalled()
    })

    it('searches only once typing pauses', async () => {
      jest.useFakeTimers()
      const wrapper = await Wrapper()
      wrapper.setData({ offset: 50 })

      await at(wrapper, 'search').setValue('yo')
      await at(wrapper, 'search').setValue('yoga')
      expect(wrapper.vm.variables).toMatchObject({ search: null, offset: 50 })

      jest.advanceTimersByTime(300)
      expect(wrapper.vm.variables).toMatchObject({ search: 'yoga', offset: 0 })
      expect(refetch).not.toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('searches at once, and asks again, on Enter', async () => {
      // Without an argument, deliberately: vue-apollo would REPLACE the reactive `variables()`
      // function with the object handed to refetch, and the watcher it keeps calling would
      // then throw on the next change — which is how every filter ended on the error page.
      const wrapper = await Wrapper()
      await at(wrapper, 'search').setValue('yoga')

      await wrapper.find('form').trigger('submit')

      expect(wrapper.vm.variables).toMatchObject({ search: 'yoga', offset: 0 })
      expect(refetch).toHaveBeenCalledWith()
    })

    it('names both filter controls for a screen reader', async () => {
      const wrapper = await Wrapper()

      expect(at(wrapper, 'search').attributes('aria-label')).toBe('admin.groups.searchPlaceholder')
      expect(at(wrapper, 'filter-type').attributes('aria-label')).toBe(
        'permissions.sections.visibility',
      )
    })
  })

  describe('paging', () => {
    it('stays hidden while everything fits on one page', async () => {
      const wrapper = await Wrapper(GROUPS, 3)

      expect(at(wrapper, 'next-button').exists()).toBe(false)
    })

    it('walks forward and back, never past the start', async () => {
      const wrapper = await Wrapper(GROUPS, 60)

      await at(wrapper, 'next-button').trigger('click')
      expect(wrapper.vm.offset).toBe(25)
      // The offset is a variable of the query: moving it is what fetches the page.
      expect(wrapper.vm.variables).toMatchObject({ offset: 25 })

      await at(wrapper, 'previous-button').trigger('click')
      expect(wrapper.vm.offset).toBe(0)

      await at(wrapper, 'previous-button').trigger('click')
      expect(wrapper.vm.offset).toBe(0)
    })
  })

  it('toasts a query error', async () => {
    const wrapper = await Wrapper()

    wrapper.vm.$options.apollo.adminGroups.error.call(wrapper.vm, { message: 'nope' })

    expect(mocks.$toast.error).toHaveBeenCalledWith('nope')
  })

  it('takes the rows and the total from the query result', async () => {
    const wrapper = await Wrapper([], 0)

    wrapper.vm.$options.apollo.adminGroups.result.call(wrapper.vm, {
      loading: false,
      data: { adminGroups: GROUPS, adminGroupCount: 3 },
    })

    expect(wrapper.vm.groups).toHaveLength(3)
    expect(wrapper.vm.total).toBe(3)
  })

  it('ignores a loading result', async () => {
    const wrapper = await Wrapper(GROUPS, 3)

    wrapper.vm.$options.apollo.adminGroups.result.call(wrapper.vm, { loading: true, data: null })

    expect(wrapper.vm.groups).toHaveLength(3)
  })
})

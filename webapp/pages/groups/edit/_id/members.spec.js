import { mount, createLocalVue } from '@vue/test-utils'
import Members from './members.vue'

const localVue = createLocalVue()

const Stub = (name, hasSlot = false) => ({
  name,
  template: hasSlot
    ? `<div class="stub-${name.toLowerCase()}"><slot /></div>`
    : `<div class="stub-${name.toLowerCase()}" />`,
})

const stubs = {
  OsCard: Stub('OsCard', true),
  AddGroupMember: Stub('AddGroupMember'),
  GroupMember: Stub('GroupMember'),
}

const factory = ({ apolloOverrides = {}, initialMembers } = {}) => {
  const refetch = jest.fn()
  const $toast = { success: jest.fn(), error: jest.fn() }
  const wrapper = mount(Members, {
    localVue,
    propsData: { group: { id: 'g1' } },
    stubs,
    // Apollo would normally add `GroupMembers` to the instance; in tests we
    // seed it via the local data() option so the prop is reactive without
    // hitting Vue's "Avoid adding reactive properties at runtime" warning.
    data: initialMembers !== undefined ? () => ({ GroupMembers: initialMembers }) : undefined,
    mocks: {
      $t: (k) => k,
      $toast,
      $apollo: {
        queries: { GroupMembers: { refetch } },
        ...apolloOverrides,
      },
    },
  })
  return { wrapper, refetch, $toast }
}

describe('pages/groups/edit/_id/members.vue', () => {
  describe('rendering', () => {
    it('mounts AddGroupMember and the GroupMember card', () => {
      const { wrapper } = factory()
      expect(wrapper.find('.stub-addgroupmember').exists()).toBe(true)
      expect(wrapper.find('.stub-groupmember').exists()).toBe(true)
      expect(wrapper.find('.stub-oscard').exists()).toBe(true)
    })
  })

  describe('groupMembers computed', () => {
    it('returns an empty array while GroupMembers is undefined', () => {
      const { wrapper } = factory()
      expect(wrapper.vm.groupMembers).toEqual([])
    })

    it('returns the loaded list once present', () => {
      const members = [{ id: 'u1' }, { id: 'u2' }]
      const { wrapper } = factory({ initialMembers: members })
      expect(wrapper.vm.groupMembers).toEqual(members)
    })
  })

  describe('loadGroupMembers', () => {
    it('refetches the GroupMembers query', () => {
      const { wrapper, refetch } = factory()
      wrapper.vm.loadGroupMembers()
      expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('is triggered by the loadGroupMembers event from AddGroupMember', async () => {
      const { wrapper, refetch } = factory()
      wrapper.findComponent({ name: 'AddGroupMember' }).vm.$emit('loadGroupMembers')
      await wrapper.vm.$nextTick()
      expect(refetch).toHaveBeenCalled()
    })

    it('is triggered by the loadGroupMembers event from GroupMember', async () => {
      const { wrapper, refetch } = factory()
      wrapper.findComponent({ name: 'GroupMember' }).vm.$emit('loadGroupMembers')
      await wrapper.vm.$nextTick()
      expect(refetch).toHaveBeenCalled()
    })
  })

  describe('apollo GroupMembers', () => {
    const apollo = Members.apollo.GroupMembers

    it('builds the members query', () => {
      expect(apollo.query.call({})).toBeDefined()
    })

    it('passes the group id with a large page size', () => {
      const variables = apollo.variables.call({ group: { id: 'g1' } })
      expect(variables).toEqual({ id: 'g1', first: 999999 })
    })

    it('clears the list and toasts on error', () => {
      const ctx = { GroupMembers: [{ id: 'x' }], $toast: { error: jest.fn() } }
      apollo.error.call(ctx, new Error('boom'))
      expect(ctx.GroupMembers).toEqual([])
      expect(ctx.$toast.error).toHaveBeenCalledWith('boom')
    })
  })
})

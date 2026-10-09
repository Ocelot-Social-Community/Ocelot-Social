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

// Adding somebody to a group gives them a role in it, so the form hangs on the same right the
// backend asks for — the default here holds it; one test below takes it away.
const factory = ({
  apolloOverrides = {},
  initialMembers,
  myGroupPermissions = ['group.member.role.assign', 'group.member.remove'],
} = {}) => {
  const refetch = jest.fn()
  const $toast = { success: jest.fn(), error: jest.fn() }
  const wrapper = mount(Members, {
    localVue,
    propsData: { group: { id: 'g1', myGroupPermissions } },
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
    it('hides the add form from somebody who may not assign roles', () => {
      // The member list stays readable — handing somebody a membership does not.
      const { wrapper } = factory({ myGroupPermissions: ['group.member.remove'] })

      expect(wrapper.findComponent({ name: 'AddGroupMember' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'GroupMember' }).exists()).toBe(true)
    })

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

  describe('apollo groupRoles', () => {
    const apollo = Members.apollo.groupRoles
    const ROLES = [
      { name: 'none', permissions: [] },
      { name: 'owner', permissions: [] },
    ]

    it('builds the rights query for the group', () => {
      expect(apollo.query.call({})).toBeDefined()
      expect(apollo.variables.call({ group: { id: 'g1' } })).toEqual({ id: 'g1' })
    })

    it('waits for the right to read the definitions instead of failing without it', () => {
      // A network admin arrives unelevated: asking then is refused, and nothing asked again
      // once they had elevated — the picker had no `owner` in a group that needed one.
      const without = factory()
      const withRight = factory({ myGroupPermissions: ['group.role.manage'] })

      expect(apollo.skip.call(without.wrapper.vm)).toBe(true)
      expect(apollo.skip.call(withRight.wrapper.vm)).toBe(false)
    })

    it('runs as soon as the refreshed group carries the right', async () => {
      const { wrapper } = factory()
      expect(apollo.skip.call(wrapper.vm)).toBe(true)

      await wrapper.setProps({ group: { id: 'g1', myGroupPermissions: ['group.role.manage'] } })

      expect(apollo.skip.call(wrapper.vm)).toBe(false)
    })

    it('keeps the definitions it reads, and ignores a pending answer', () => {
      const ctx = { roles: [] }
      apollo.result.call(ctx, { data: null, loading: true })
      expect(ctx.roles).toEqual([])

      apollo.result.call(ctx, { data: { Group: [{ roles: ROLES }] }, loading: false })
      expect(ctx.roles).toEqual(ROLES)

      apollo.result.call(ctx, { data: { Group: [] }, loading: false })
      expect(ctx.roles).toEqual([])
    })

    it('falls back to no definitions on error', () => {
      const ctx = { roles: ROLES }
      apollo.error.call(ctx)
      expect(ctx.roles).toEqual([])
    })

    it('offers the definitions without `none`, and only while the right holds', async () => {
      const { wrapper } = factory({ myGroupPermissions: ['group.role.manage'] })
      await wrapper.setData({ roles: ROLES })
      expect(wrapper.vm.assignableRoles.map((role) => role.name)).toEqual(['owner'])

      // Ending the elevation takes the right away again; what was read under it goes too.
      await wrapper.setProps({ group: { id: 'g1', myGroupPermissions: [] } })
      expect(wrapper.vm.assignableRoles).toEqual([])
    })
  })

  describe('apollo GroupMembers', () => {
    const apollo = Members.apollo.GroupMembers

    it('builds the members query', () => {
      expect(apollo.query.call({})).toBeDefined()
    })

    it('passes the group id with a large page size and includes pending', () => {
      const variables = apollo.variables.call({ group: { id: 'g1' } })
      expect(variables).toEqual({ id: 'g1', first: 999999, includePending: true })
    })

    it('clears the list and toasts on error', () => {
      const ctx = {
        GroupMembers: [{ id: 'x' }],
        $toast: { error: jest.fn() },
        $toastBackendError(error) {
          this.$toast.error(error.message)
        },
      }
      apollo.error.call(ctx, new Error('boom'))
      expect(ctx.GroupMembers).toEqual([])
      expect(ctx.$toast.error).toHaveBeenCalledWith('boom')
    })
  })
})

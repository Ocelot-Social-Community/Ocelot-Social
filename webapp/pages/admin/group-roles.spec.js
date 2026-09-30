import { mount } from '@vue/test-utils'

import groupRoles from './group-roles.vue'

const localVue = global.localVue

const CATALOG = [
  {
    key: 'group.post.create',
    group: 'content',
    description: 'Post.',
    gatedBy: [],
    requiresNetworkPermission: 'post.create',
  },
  {
    key: 'group.members.read',
    group: 'visibility',
    description: 'See members.',
    gatedBy: [],
    requiresNetworkPermission: null,
  },
]

const role = (name, permissions, extra = {}) => ({
  name,
  label: null,
  system: true,
  protected: false,
  permissions,
  ...extra,
})

const TEMPLATES = [
  {
    groupType: 'public',
    untouchedGroupCount: 4,
    roles: [
      role('none', ['group.members.read']),
      role('usual', ['group.post.create']),
      role('owner', [], { protected: true }),
    ],
  },
  {
    groupType: 'closed',
    untouchedGroupCount: 0,
    roles: [role('none', []), role('usual', ['group.post.create'])],
  },
]

const stubs = {
  'os-card': { template: '<div><slot /></div>' },
  'os-button': {
    template: '<button :disabled="disabled" v-on="$listeners"><slot /></button>',
    props: ['disabled'],
  },
}

describe('admin/group-roles.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)),
      $toast: { success: jest.fn(), error: jest.fn() },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: {
            updateGroupRoleTemplate: role('usual', ['group.post.create', 'group.members.read']),
            applyGroupRoleTemplates: 4,
          },
        }),
      },
      localVue,
    }
  })

  const at = (wrapper, testId) => wrapper.find(`[data-test="${testId}"]`)

  const Wrapper = async () => {
    const wrapper = mount(groupRoles, { localVue, mocks, stubs })
    wrapper.vm.$options.apollo.templatesQuery.result.call(wrapper.vm, {
      loading: false,
      data: { groupPermissionCatalog: CATALOG, groupRoleTemplates: TEMPLATES },
    })
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('offers one tab per group type and starts on public', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'type-tab-public').exists()).toBe(true)
    expect(at(wrapper, 'type-tab-closed').exists()).toBe(true)
    expect(wrapper.vm.activeType).toBe('public')
  })

  it('says how many groups still run on the template untouched', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'untouched').text()).toContain('4')
  })

  it('switches the roles when the group type changes', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'type-tab-closed').trigger('click')

    expect(wrapper.vm.activeTemplate.groupType).toBe('closed')
    // The draft follows the type, so an edit cannot leak from one template into another.
    expect(wrapper.vm.draft).toEqual(['group.post.create'])
    expect(at(wrapper, 'apply').element.disabled).toBe(true)
  })

  it('explains the owner role rather than offering checkboxes', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'role-tab-owner').trigger('click')

    expect(at(wrapper, 'owner-note').exists()).toBe(true)
    expect(at(wrapper, 'perm-group.post.create').exists()).toBe(false)
  })

  it('saves a changed permission set', async () => {
    const wrapper = await Wrapper()

    at(wrapper, 'perm-group.members.read').element.checked = true
    await at(wrapper, 'perm-group.members.read').trigger('change')
    expect(wrapper.vm.dirty).toBe(true)

    await at(wrapper, 'save').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          groupType: 'public',
          name: 'usual',
          permissions: ['group.post.create', 'group.members.read'],
        }),
      }),
    )
    expect(mocks.$toast.success).toHaveBeenCalled()
  })

  it('reverts a draft', async () => {
    const wrapper = await Wrapper()

    at(wrapper, 'perm-group.members.read').element.checked = true
    await at(wrapper, 'perm-group.members.read').trigger('change')
    await at(wrapper, 'revert').trigger('click')

    expect(wrapper.vm.dirty).toBe(false)
    expect(wrapper.vm.draft).toEqual(['group.post.create'])
  })

  it('toasts a save error', async () => {
    mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'nope' })
    const wrapper = await Wrapper()

    at(wrapper, 'perm-group.members.read').element.checked = true
    await at(wrapper, 'perm-group.members.read').trigger('change')
    await at(wrapper, 'save').trigger('click')
    await wrapper.vm.$nextTick()

    expect(mocks.$toast.error).toHaveBeenCalledWith('nope')
  })

  describe('applying the template', () => {
    afterEach(() => {
      delete window.confirm
    })

    it('asks first and reports how many groups changed', async () => {
      window.confirm = jest.fn().mockReturnValue(true)
      const wrapper = await Wrapper()

      await at(wrapper, 'apply').trigger('click')
      await wrapper.vm.$nextTick()

      expect(window.confirm).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalledWith(
        expect.stringContaining('admin.groupRoles.applied'),
      )
    })

    it('does nothing when declined', async () => {
      window.confirm = jest.fn().mockReturnValue(false)
      const wrapper = await Wrapper()

      await at(wrapper, 'apply').trigger('click')

      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })
  })

  it('toasts a query error', async () => {
    const wrapper = mount(groupRoles, { localVue, mocks, stubs })

    wrapper.vm.$options.apollo.templatesQuery.error.call(wrapper.vm, { message: 'boom' })

    expect(mocks.$toast.error).toHaveBeenCalledWith('boom')
  })
})

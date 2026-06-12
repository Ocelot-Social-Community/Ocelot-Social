import { mount } from '@vue/test-utils'
import Roles from './roles.vue'

const localVue = global.localVue

const stubs = {
  // Render slot content so the inner role sections appear.
  OsCard: { template: '<div><slot /></div>' },
  OsButton: { template: '<button><slot /></button>' },
}

const permissionCatalog = [
  { key: 'badge.manage', group: 'moderation', description: 'Grant badges' },
  { key: 'post.create', group: 'content', description: 'Create posts' },
]

const roles = [
  { name: 'owner', description: 'o', protected: true, permissions: [], memberCount: 1 },
  {
    name: 'badge-setter',
    description: '',
    protected: false,
    permissions: ['badge.manage'],
    memberCount: 2,
  },
  {
    name: 'user',
    description: 'baseline',
    protected: false,
    permissions: ['post.create'],
    memberCount: 5,
  },
]

describe('admin/roles.vue', () => {
  let mutate

  const Wrapper = () => {
    mutate = jest.fn().mockResolvedValue({})
    const mocks = {
      $t: jest.fn((key, args) => (args ? `${key}:${JSON.stringify(args)}` : key)),
      $toast: { error: jest.fn(), success: jest.fn() },
      $apollo: {
        mutate,
        queries: { roles: { refetch: jest.fn().mockResolvedValue() } },
      },
    }
    const wrapper = mount(Roles, {
      localVue,
      mocks,
      stubs,
      data: () => ({ roles, permissionCatalog }),
    })
    // The apollo result() hook (which builds the editable drafts) does not fire
    // with a mocked $apollo, so build them explicitly.
    wrapper.vm.buildForms()
    return wrapper
  }

  it('renders a section for every role', () => {
    const wrapper = Wrapper()
    expect(wrapper.find('[data-test="role-owner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-badge-setter"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-user"]').exists()).toBe(true)
  })

  it('does not offer to edit or delete the protected owner role', () => {
    const wrapper = Wrapper()
    expect(wrapper.find('[data-test="role-owner-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="role-owner-delete"]').exists()).toBe(false)
  })

  it('only allows deleting non-protected, non-baseline roles', () => {
    const wrapper = Wrapper()
    expect(wrapper.vm.canDelete(roles[0])).toBe(false) // owner (protected)
    expect(wrapper.vm.canDelete(roles[2])).toBe(false) // user (baseline)
    expect(wrapper.vm.canDelete(roles[1])).toBe(true) // badge-setter
  })

  it('tracks dirtiness when a permission is toggled', () => {
    const wrapper = Wrapper()
    expect(wrapper.vm.isDirty(roles[1])).toBe(false)
    wrapper.vm.forms['badge-setter'].permissions['post.create'] = true
    expect(wrapper.vm.isDirty(roles[1])).toBe(true)
  })

  it('saveRole sends the selected permissions to updateRole', async () => {
    const wrapper = Wrapper()
    wrapper.vm.forms['badge-setter'].permissions['post.create'] = true
    await wrapper.vm.saveRole(roles[1])
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          name: 'badge-setter',
          permissions: expect.arrayContaining(['badge.manage', 'post.create']),
        }),
      }),
    )
  })

  it('removeRole deletes by name', async () => {
    const wrapper = Wrapper()
    await wrapper.vm.removeRole(roles[1])
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { name: 'badge-setter' } }),
    )
  })

  it('createRole sends the new role with its selected permissions', async () => {
    const wrapper = Wrapper()
    wrapper.setData({
      newRole: {
        name: 'event-org',
        description: 'Organizers',
        permissions: { 'badge.manage': false, 'post.create': true },
      },
    })
    await wrapper.vm.createRole()
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          name: 'event-org',
          description: 'Organizers',
          permissions: ['post.create'],
        },
      }),
    )
  })
})

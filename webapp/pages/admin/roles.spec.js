import { mount } from '@vue/test-utils'
import Roles from './roles.vue'

const localVue = global.localVue

const stubs = {
  // Render slot content so the inner role sections appear.
  OsCard: { template: '<div><slot /></div>' },
  OsButton: { template: '<button><slot /></button>' },
  'nuxt-link': { props: ['to'], template: '<a><slot /></a>' },
}

const permissionCatalog = [
  { key: 'badge.manage', group: 'moderation', description: 'Grant badges' },
  { key: 'post.create', group: 'content', description: 'Create posts' },
]

const roles = [
  { name: 'owner', protected: true, permissions: [], memberCount: 1 },
  {
    name: 'badge-setter',
    protected: false,
    permissions: ['badge.manage'],
    memberCount: 2,
  },
  {
    name: 'user',
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
    // The apollo result() hook (which builds the editable drafts + selects the
    // default active role) does not fire with a mocked $apollo, so build explicitly.
    wrapper.vm.buildForms()
    return wrapper
  }

  it('renders a switcher tab for every role', () => {
    const wrapper = Wrapper()
    expect(wrapper.find('[data-test="role-tab-owner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-tab-badge-setter"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-tab-user"]').exists()).toBe(true)
  })

  it('shows only the active role (the first one) at a time', () => {
    const wrapper = Wrapper()
    expect(wrapper.vm.activeRoleName).toBe('owner')
    expect(wrapper.find('[data-test="role-owner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-badge-setter"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="role-user"]').exists()).toBe(false)
  })

  it('switches the active role when another tab is clicked', async () => {
    const wrapper = Wrapper()
    await wrapper.find('[data-test="role-tab-badge-setter"]').trigger('click')
    expect(wrapper.vm.activeRoleName).toBe('badge-setter')
    expect(wrapper.find('[data-test="role-badge-setter"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-owner"]').exists()).toBe(false)
  })

  it('shows a disabled save + delete (with a hint) for the protected owner role', async () => {
    const wrapper = Wrapper() // owner is active by default
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="role-owner-save"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-owner-delete"]').exists()).toBe(true)
    expect(wrapper.vm.saveDisabled(roles[0])).toBe(true)
    expect(wrapper.vm.canDelete(roles[0])).toBe(false)
    expect(wrapper.vm.saveHint(roles[0])).toBeTruthy()
    expect(wrapper.vm.deleteHint(roles[0])).toBeTruthy()
  })

  it('shows the owner permissions all checked and disabled', async () => {
    const wrapper = Wrapper() // owner active by default
    await wrapper.vm.$nextTick()
    expect(Object.values(wrapper.vm.forms.owner.permissions).every(Boolean)).toBe(true)
    const checkbox = wrapper.find('[data-test="role-owner-perm-badge.manage"]')
    expect(checkbox.attributes('disabled')).toBeDefined()
  })

  it('localizes group + permission labels, falling back to the catalog description', () => {
    const wrapper = Wrapper()
    const perm = { key: 'badge.manage', description: 'Grant badges' }
    // No translation present (mock $t returns the key): fall back to the description.
    expect(wrapper.vm.permLabel(perm)).toBe('Grant badges')
    expect(wrapper.vm.groupLabel('moderation')).toBe('moderation')
    // Translation present: look it up by the sanitised (dot-free) key.
    wrapper.vm.$t = (path) => `T:${path}`
    expect(wrapper.vm.permLabel(perm)).toBe('T:admin.roles.perm.badge_manage')
    expect(wrapper.vm.groupLabel('moderation')).toBe('T:admin.roles.groups.moderation')
  })

  it('links the member count to the user list filtered by that role', () => {
    const wrapper = Wrapper() // owner active by default
    const link = wrapper.find('[data-test="role-owner-members"]')
    expect(link.exists()).toBe(true)
    expect(link.props('to')).toEqual({ name: 'admin-users', query: { role: 'owner' } })
  })

  it('previews the permission diff when hovering another role pill', async () => {
    const wrapper = Wrapper()
    wrapper.vm.setActive('badge-setter')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="role-tab-user"]').trigger('mouseenter')
    // active (badge-setter) has badge.manage but not post.create; user is the inverse.
    expect(wrapper.vm.hoverDiff).toEqual({
      'badge.manage': 'removed',
      'post.create': 'added',
    })
  })

  it('only allows deleting non-protected, non-baseline roles without members', () => {
    const wrapper = Wrapper()
    expect(wrapper.vm.canDelete(roles[0])).toBe(false) // owner (protected)
    expect(wrapper.vm.canDelete(roles[2])).toBe(false) // user (baseline)
    expect(wrapper.vm.canDelete(roles[1])).toBe(false) // badge-setter still has 2 members
    expect(wrapper.vm.canDelete({ name: 'empty', protected: false, memberCount: 0 })).toBe(true)
  })

  it('hints to reassign members before a role with members can be deleted', () => {
    const wrapper = Wrapper()
    // badge-setter has members → undeletable with the "reassign first" hint
    expect(wrapper.vm.deleteHint(roles[1])).toBe('admin.roles.cannotDeleteHasMembers')
    // an empty custom role is deletable → no hint
    expect(wrapper.vm.deleteHint({ name: 'empty', protected: false, memberCount: 0 })).toBe('')
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

  it('the + button turns into a name input', async () => {
    const wrapper = Wrapper()
    expect(wrapper.find('[data-test="role-add"]').exists()).toBe(true)
    await wrapper.find('[data-test="role-add"]').trigger('click')
    expect(wrapper.vm.creating).toBe(true)
    expect(wrapper.find('[data-test="new-role-name"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-add"]').exists()).toBe(false)
  })

  it('createRole creates an empty role from the typed name and selects it', async () => {
    const wrapper = Wrapper()
    wrapper.vm.startCreate()
    wrapper.setData({ newRole: { name: 'event-org' } })
    await wrapper.vm.createRole()
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          name: 'event-org',
          permissions: [],
        },
      }),
    )
    expect(wrapper.vm.activeRoleName).toBe('event-org')
    expect(wrapper.vm.creating).toBe(false)
  })
})

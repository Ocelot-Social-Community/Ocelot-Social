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

  it('shows only the active role at a time, defaulting to the lowest-privilege (user) role', () => {
    const wrapper = Wrapper()
    // Display order is reversed (lowest-privilege first), so the baseline `user` role
    // leads and is selected by default; the protected `owner` failsafe trails.
    expect(wrapper.vm.activeRoleName).toBe('user')
    expect(wrapper.find('[data-test="role-user"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-owner"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="role-badge-setter"]').exists()).toBe(false)
  })

  it('orders the role tabs lowest-privilege first (user … owner)', () => {
    const wrapper = Wrapper()
    const tabNames = wrapper
      .findAll('.role-tab')
      .wrappers.map((w) => w.attributes('data-test'))
      .filter((t) => t && t.startsWith('role-tab-') && t !== 'role-tab-badge-setter')
    // owner is last; user is first of the default roles.
    expect(wrapper.vm.orderedRoles.map((r) => r.name)).toEqual(['user', 'badge-setter', 'owner'])
    expect(tabNames[tabNames.length - 1]).toBe('role-tab-owner')
  })

  it('switches the active role when another tab is clicked', async () => {
    const wrapper = Wrapper()
    await wrapper.find('[data-test="role-tab-badge-setter"]').trigger('click')
    expect(wrapper.vm.activeRoleName).toBe('badge-setter')
    expect(wrapper.find('[data-test="role-badge-setter"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-owner"]').exists()).toBe(false)
  })

  it('shows a disabled save + delete (with a hint) for the protected owner role', async () => {
    const wrapper = Wrapper()
    wrapper.vm.setActive('owner')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="role-owner-save"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-owner-delete"]').exists()).toBe(true)
    expect(wrapper.vm.saveDisabled(roles[0])).toBe(true)
    expect(wrapper.vm.canDelete(roles[0])).toBe(false)
    expect(wrapper.vm.saveHint(roles[0])).toBeTruthy()
    expect(wrapper.vm.deleteHint(roles[0])).toBeTruthy()
  })

  it('shows the owner permissions all checked and disabled', async () => {
    const wrapper = Wrapper()
    wrapper.vm.setActive('owner')
    await wrapper.vm.$nextTick()
    expect(Object.values(wrapper.vm.forms.owner.permissions).every(Boolean)).toBe(true)
    const checkbox = wrapper.find('[data-test="role-owner-perm-badge.manage"]')
    expect(checkbox.attributes('disabled')).toBeDefined()
  })

  it('disables a permission whose feature gate is closed and shows a note', async () => {
    // The backend marks a right unavailable (available: false) when its feature isn't
    // configured (e.g. video conferencing). The admin must not be able to grant it.
    const gatedCatalog = [
      { key: 'post.create', group: 'content', description: 'Create posts', available: true },
      {
        key: 'videoCall.create_public',
        group: 'communication',
        description: 'Start a public call',
        gatedBy: 'videoCall',
        available: false,
      },
    ]
    const wrapper = mount(Roles, {
      localVue,
      mocks: {
        $t: jest.fn((key) => key),
        $toast: { error: jest.fn(), success: jest.fn() },
        $apollo: { mutate: jest.fn(), queries: { roles: { refetch: jest.fn() } } },
      },
      stubs,
      data: () => ({ roles, permissionCatalog: gatedCatalog }),
    })
    wrapper.vm.buildForms()
    wrapper.vm.setActive('user') // a non-protected role, so disabling is gate-driven only
    await wrapper.vm.$nextTick()
    // The gated right is disabled; the ungated one stays editable.
    expect(
      wrapper.find('[data-test="role-user-perm-videoCall.create_public"]').attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.find('[data-test="role-user-perm-post.create"]').attributes('disabled'),
    ).toBeUndefined()
    // …and the "not configured" note is shown next to it.
    expect(wrapper.find('.perm-row__gate').exists()).toBe(true)
  })

  it('preserves unsaved edits when forms are rebuilt by a live refetch', async () => {
    // A permissionsChanged signal (role change elsewhere, or a gate-policy toggle)
    // refetches and rebuilds forms. An editable role with in-progress edits must keep
    // them; a clean role refreshes from the server.
    const wrapper = Wrapper()
    wrapper.vm.setActive('user')
    // user starts with only post.create; tick badge.manage on (now dirty, unsaved).
    wrapper.vm.forms.user.permissions['badge.manage'] = true
    expect(wrapper.vm.isDirty(roles.find((r) => r.name === 'user'))).toBe(true)
    // A rebuild (as a live refetch would trigger) must not clobber the edit.
    wrapper.vm.buildForms()
    expect(wrapper.vm.forms.user.permissions['badge.manage']).toBe(true)
    // The untouched badge-setter role is rebuilt from the server set.
    expect(wrapper.vm.forms['badge-setter'].permissions['badge.manage']).toBe(true)
    expect(wrapper.vm.forms['badge-setter'].permissions['post.create']).toBe(false)
  })

  it('refreshFromServer refetches the catalog and roles (live availability update)', () => {
    const wrapper = Wrapper()
    const permissionCatalog = { refetch: jest.fn() }
    const rolesQ = { refetch: jest.fn() }
    wrapper.vm.$apollo.queries = { permissionCatalog, roles: rolesQ }
    wrapper.vm.refreshFromServer()
    expect(permissionCatalog.refetch).toHaveBeenCalledTimes(1)
    expect(rolesQ.refetch).toHaveBeenCalledTimes(1)
  })

  it('rebuilds the owner form once the catalog loads after the roles', async () => {
    // roles arrive before the permission catalog: forms are built against an empty
    // catalog first → owner would have no checked permissions until a rebuild.
    const wrapper = mount(Roles, {
      localVue,
      mocks: {
        $t: jest.fn((key) => key),
        $te: jest.fn(() => false),
        $toast: { error: jest.fn(), success: jest.fn() },
        $apollo: { mutate: jest.fn(), queries: { roles: { refetch: jest.fn() } } },
      },
      stubs,
      data: () => ({ roles, permissionCatalog: [] }),
    })
    wrapper.vm.buildForms()
    expect(Object.keys(wrapper.vm.forms.owner.permissions)).toHaveLength(0)
    // catalog arrives → its result() handler rebuilds the forms
    wrapper.setData({ permissionCatalog })
    wrapper.vm.buildForms()
    expect(Object.values(wrapper.vm.forms.owner.permissions).every(Boolean)).toBe(true)
    expect(Object.keys(wrapper.vm.forms.owner.permissions).length).toBeGreaterThan(0)
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

  it('links the member count to the user list filtered by that role', async () => {
    const wrapper = Wrapper()
    wrapper.vm.setActive('owner')
    await wrapper.vm.$nextTick()
    const link = wrapper.find('[data-test="role-owner-members"]')
    expect(link.exists()).toBe(true)
    expect(link.props('to')).toEqual({ name: 'admin-users', query: { q: 'role:owner' } })
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

  describe('self-lockout warning', () => {
    const catalog = [{ key: 'role.manage', group: 'administration', description: 'Manage roles' }]
    const adminRole = {
      name: 'admin',
      protected: false,
      permissions: ['role.manage'],
      memberCount: 1,
    }

    // Mount with the auth context the warning depends on ($store roleName + $can).
    const LockoutWrapper = ({ ownRole = 'admin', canManage = true } = {}) => {
      const localMutate = jest.fn().mockResolvedValue({})
      const wrapper = mount(Roles, {
        localVue,
        mocks: {
          $t: jest.fn((key, args) => (args ? `${key}:${JSON.stringify(args)}` : key)),
          $toast: { error: jest.fn(), success: jest.fn() },
          $apollo: {
            mutate: localMutate,
            queries: { roles: { refetch: jest.fn().mockResolvedValue() } },
          },
          $store: { getters: { 'auth/user': { roleName: ownRole } } },
          $can: (permission) => canManage && permission === 'role.manage',
        },
        // Stub the modal itself — we assert on state/callbacks, not its rendering.
        stubs: { ...stubs, ConfirmModal: true },
        data: () => ({ roles: [adminRole], permissionCatalog: catalog }),
      })
      wrapper.vm.buildForms()
      return { wrapper, localMutate }
    }

    it('warns (and defers the save) when removing role.manage from the own role', async () => {
      const { wrapper, localMutate } = LockoutWrapper()
      wrapper.vm.forms.admin.permissions['role.manage'] = false
      const result = wrapper.vm.saveRole(adminRole)
      expect(result).toBeUndefined()
      expect(wrapper.vm.showConfirmModal).toBe(true)
      expect(localMutate).not.toHaveBeenCalled()
      // Confirming runs the actual mutation with the now-empty permission set.
      await wrapper.vm.confirmModalData.buttons.confirm.callback()
      expect(localMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ name: 'admin', permissions: [] }),
        }),
      )
    })

    it('saves directly when the own role keeps role.manage', async () => {
      const { wrapper, localMutate } = LockoutWrapper()
      await wrapper.vm.saveRole(adminRole) // role.manage still checked
      expect(wrapper.vm.showConfirmModal).toBe(false)
      expect(localMutate).toHaveBeenCalled()
    })

    it('does not warn when editing a role that is not the user own', () => {
      const { wrapper } = LockoutWrapper({ ownRole: 'someone-else' })
      wrapper.vm.forms.admin.permissions['role.manage'] = false
      expect(wrapper.vm.wouldLockSelfOut(adminRole)).toBe(false)
    })

    it('does not warn when the user does not currently hold role.manage', () => {
      const { wrapper } = LockoutWrapper({ canManage: false })
      wrapper.vm.forms.admin.permissions['role.manage'] = false
      expect(wrapper.vm.wouldLockSelfOut(adminRole)).toBe(false)
    })

    it('does not warn (no auth context) in plain mounts', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.wouldLockSelfOut(roles[1])).toBe(false)
    })
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

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
    // Assert the full visible tab order straight from the DOM (the role-tab buttons only,
    // not the add button / container), so a regression in the rendered order is caught.
    const tabOrder = wrapper
      .findAll('[data-test^="role-tab-"]')
      .wrappers.map((w) => w.attributes('data-test'))
    expect(tabOrder).toEqual(['role-tab-user', 'role-tab-badge-setter', 'role-tab-owner'])
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
    // Resolve each permission's row (the label wrapping its checkbox) so assertions are
    // scoped to the right permission, not the page at large.
    const rowOf = (key) =>
      wrapper
        .findAll('.perm-row')
        .wrappers.find((row) => row.find(`[data-test="role-user-perm-${key}"]`).exists())
    const gatedRow = rowOf('videoCall.create_public')
    const openRow = rowOf('post.create')
    // The gated right is disabled and carries the "not configured" note…
    expect(gatedRow.find('input').attributes('disabled')).toBeDefined()
    expect(gatedRow.find('.perm-row__gate').exists()).toBe(true)
    // …the ungated one stays editable and shows no note.
    expect(openRow.find('input').attributes('disabled')).toBeUndefined()
    expect(openRow.find('.perm-row__gate').exists()).toBe(false)
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

  it('labels the active role name so a terse name still reads as the role', async () => {
    const wrapper = Wrapper()
    wrapper.vm.setActive('badge-setter')
    await wrapper.vm.$nextTick()
    const label = wrapper.find('.role__label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('admin.roles.roleLabel:')
  })

  describe('rename', () => {
    it('offers rename only for non-protected, non-baseline roles', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.canRename(roles[0])).toBe(false) // owner (protected)
      expect(wrapper.vm.canRename(roles[2])).toBe(false) // user (baseline)
      expect(wrapper.vm.canRename(roles[1])).toBe(true) // badge-setter (custom)
    })

    it('shows the rename affordance only for a renamable active role', async () => {
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="role-rename"]').exists()).toBe(true)
      // The baseline user role cannot be renamed → no pencil.
      wrapper.vm.setActive('user')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="role-rename"]').exists()).toBe(false)
    })

    it('the pencil turns the role name into an input prefilled with the current name', async () => {
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="role-rename"]').trigger('click')
      expect(wrapper.vm.renaming).toBe(true)
      expect(wrapper.vm.renameValue).toBe('badge-setter')
      const input = wrapper.find('[data-test="rename-role-name"]')
      expect(input.exists()).toBe(true)
      // Explicit accessible name (the placeholder alone is not a reliable label).
      expect(input.attributes('aria-label')).toBe('admin.roles.rename')
    })

    it('renameRole sends the old and new name, then selects the renamed role', async () => {
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'badge-master' })
      await wrapper.vm.renameRole()
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { name: 'badge-setter', newName: 'badge-master' },
        }),
      )
      expect(wrapper.vm.activeRoleName).toBe('badge-master')
      expect(wrapper.vm.renaming).toBe(false)
    })

    it('optimistically re-selects the renamed role and carries its unsaved draft, independent of the refetch', async () => {
      // Regression: the selection (and the role body, keyed by forms[activeRole.name])
      // must follow the rename immediately — not depend on the cache-and-network refetch,
      // whose stale cache emit would otherwise reset it to the first tab.
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      // Make an unsaved edit before renaming: tick a permission the role doesn't have.
      wrapper.vm.forms['badge-setter'].permissions['post.create'] = true
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'badge-master' })
      await wrapper.vm.renameRole()
      const names = wrapper.vm.roles.map((role) => role.name)
      expect(names).toContain('badge-master')
      expect(names).not.toContain('badge-setter')
      expect(wrapper.vm.activeRole.name).toBe('badge-master')
      // The unsaved draft moved with the role: the ticked permission survives under the
      // new name (alongside the role's existing one), so the edit is not silently lost.
      expect(wrapper.vm.forms['badge-master'].permissions['post.create']).toBe(true)
      expect(wrapper.vm.forms['badge-master'].permissions['badge.manage']).toBe(true)
    })

    it('patchRolesCacheRename rewrites the renamed role in the roles-query cache', () => {
      const wrapper = Wrapper()
      const store = {
        readQuery: jest.fn(() => ({
          roles: [
            { name: 'owner', permissions: [] },
            { name: 'badge-setter', permissions: ['badge.manage'] },
          ],
        })),
        writeQuery: jest.fn(),
      }
      wrapper.vm.patchRolesCacheRename(store, 'badge-setter', {
        name: 'badge-master',
        permissions: ['badge.manage'],
      })
      expect(store.writeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            roles: [
              { name: 'owner', permissions: [] },
              { name: 'badge-master', permissions: ['badge.manage'] },
            ],
          },
        }),
      )
    })

    it('patchRolesCacheRename no-ops when there is no payload or no cached roles query', () => {
      const wrapper = Wrapper()
      const throwingStore = {
        readQuery: jest.fn(() => {
          throw new Error('not in cache')
        }),
        writeQuery: jest.fn(),
      }
      // Missing mutation payload → nothing read or written.
      wrapper.vm.patchRolesCacheRename(throwingStore, 'badge-setter', null)
      expect(throwingStore.readQuery).not.toHaveBeenCalled()
      // Cache miss (readQuery throws) → swallowed, no write.
      wrapper.vm.patchRolesCacheRename(throwingStore, 'badge-setter', { name: 'x' })
      expect(throwingStore.writeQuery).not.toHaveBeenCalled()
      // Cache read returns nothing → also a no-op.
      const emptyStore = { readQuery: jest.fn(() => null), writeQuery: jest.fn() }
      wrapper.vm.patchRolesCacheRename(emptyStore, 'badge-setter', { name: 'x' })
      expect(emptyStore.writeQuery).not.toHaveBeenCalled()
    })

    it('renameRole patches the roles-query cache (via followRename) and selects the new name', async () => {
      const wrapper = Wrapper()
      const cache = {
        readQuery: jest.fn(() => ({ roles: [{ name: 'badge-setter', permissions: [] }] })),
        writeQuery: jest.fn(),
      }
      wrapper.vm.$apollo.provider = { defaultClient: cache }
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'badge-master' })
      await wrapper.vm.renameRole()
      expect(cache.writeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { roles: [{ name: 'badge-master', permissions: [] }] },
        }),
      )
      expect(wrapper.vm.activeRoleName).toBe('badge-master')
    })

    it('follows the rename even though the cache write broadcasts to the roles query mid-update', () => {
      // Regression: writeQuery broadcasts SYNCHRONOUSLY to the roles smart-query
      // (→ ensureActive). The selection must be moved BEFORE the cache write, else the
      // broadcast resets it to the first tab and the follow condition (=== oldName) misses.
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      const cache = {
        readQuery: jest.fn(() => ({
          roles: [{ name: 'badge-setter', permissions: ['badge.manage'] }],
        })),
        writeQuery: jest.fn(() => {
          // Simulate Apollo's broadcast: the list now carries the new name, ensureActive runs.
          wrapper.vm.roles = [
            { name: 'owner', protected: true, permissions: [], memberCount: 1 },
            {
              name: 'badge-master',
              protected: false,
              permissions: ['badge.manage'],
              memberCount: 2,
            },
            { name: 'user', protected: false, permissions: ['post.create'], memberCount: 5 },
          ]
          wrapper.vm.ensureActive()
        }),
      }
      wrapper.vm.$apollo.provider = { defaultClient: cache }
      wrapper.vm.followRename('badge-setter', 'badge-master')
      expect(wrapper.vm.activeRoleName).toBe('badge-master')
    })

    it('shows an error toast when the rename mutation fails', async () => {
      const wrapper = Wrapper()
      const toastError = wrapper.vm.$toast.error
      wrapper.vm.$apollo.mutate = jest.fn().mockRejectedValue(new Error('Role already exists.'))
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'badge-master' })
      await wrapper.vm.renameRole()
      expect(toastError).toHaveBeenCalledWith(
        'admin.roles.renameError:{"message":"Role already exists."}',
      )
      // The rename mode stays open (with the typed value) so the admin can correct the
      // name — the error path must not cancel it or move the selection.
      expect(wrapper.vm.renaming).toBe(true)
      expect(wrapper.vm.renameValue).toBe('badge-master')
      expect(wrapper.vm.activeRoleName).toBe('badge-setter')
    })

    it('does not show a rename error when only the post-rename refetch fails', async () => {
      // The mutation succeeded and followRename already updated the UI, so a failing
      // reconciliation refetch must NOT add a renameError on top of the success toast.
      const wrapper = Wrapper()
      const toastSuccess = wrapper.vm.$toast.success
      const toastError = wrapper.vm.$toast.error
      wrapper.vm.$apollo.queries.roles.refetch = jest.fn().mockRejectedValue(new Error('network'))
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'badge-master' })
      await wrapper.vm.renameRole()
      expect(toastSuccess).toHaveBeenCalledWith('admin.roles.renameSuccess')
      expect(toastError).not.toHaveBeenCalled()
      // The optimistic rename stands despite the refetch failure.
      expect(wrapper.vm.activeRoleName).toBe('badge-master')
    })

    it('renameRole is a no-op when the name is unchanged or empty', async () => {
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'badge-setter' }) // unchanged
      await wrapper.vm.renameRole()
      wrapper.setData({ renameValue: '   ' }) // blank
      await wrapper.vm.renameRole()
      expect(mutate).not.toHaveBeenCalled()
    })

    it('onPermissionsChanged follows a rename from another client and keeps it selected', async () => {
      // A second admin viewing the renamed role: the subscription carries the old name,
      // so the selection follows to the new one instead of resetting to the first tab.
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      const cache = {
        readQuery: jest.fn(() => ({
          roles: [{ name: 'badge-setter', permissions: ['badge.manage'] }],
        })),
        writeQuery: jest.fn(),
      }
      wrapper.vm.$apollo.provider = { defaultClient: cache }
      wrapper.vm.onPermissionsChanged({
        roleName: 'badge-master',
        previousRoleName: 'badge-setter',
      })
      expect(wrapper.vm.activeRoleName).toBe('badge-master')
      const names = wrapper.vm.roles.map((role) => role.name)
      expect(names).toContain('badge-master')
      expect(names).not.toContain('badge-setter')
      expect(wrapper.vm.forms['badge-master']).toBeTruthy()
      // The client cache is patched so the refetch's stale emit cannot drop the role.
      expect(cache.writeQuery).toHaveBeenCalled()
    })

    it('onPermissionsChanged keeps the selection when a different role is renamed', () => {
      const wrapper = Wrapper()
      wrapper.vm.setActive('user')
      wrapper.vm.onPermissionsChanged({
        roleName: 'badge-master',
        previousRoleName: 'badge-setter',
      })
      expect(wrapper.vm.activeRoleName).toBe('user')
      const names = wrapper.vm.roles.map((role) => role.name)
      expect(names).toContain('badge-master')
      expect(names).not.toContain('badge-setter')
    })

    it('closes an open rename editor when that same role is renamed externally', () => {
      // A stale renameValue must not survive an external rename of the role being edited —
      // otherwise confirming it would submit the stale name against the renamed role.
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.setData({ renameValue: 'my-typed-name' })
      expect(wrapper.vm.renaming).toBe(true)
      wrapper.vm.onPermissionsChanged({
        roleName: 'badge-master',
        previousRoleName: 'badge-setter',
      })
      expect(wrapper.vm.renaming).toBe(false)
      expect(wrapper.vm.renameValue).toBe('')
      expect(wrapper.vm.activeRoleName).toBe('badge-master')
    })

    it('keeps an open rename editor when a different role is renamed externally', () => {
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.startRename()
      wrapper.vm.onPermissionsChanged({ roleName: 'founder', previousRoleName: 'owner' })
      // The editor is for badge-setter, so an owner→founder rename leaves it open.
      expect(wrapper.vm.renaming).toBe(true)
      expect(wrapper.vm.activeRoleName).toBe('badge-setter')
    })

    it('onPermissionsChanged just refreshes on a non-rename signal', () => {
      const wrapper = Wrapper()
      const refresh = jest.spyOn(wrapper.vm, 'refreshFromServer').mockImplementation(() => {})
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.onPermissionsChanged({ roleName: 'user', previousRoleName: null })
      expect(wrapper.vm.activeRoleName).toBe('badge-setter')
      expect(refresh).toHaveBeenCalled()
    })

    it('ensureActive does not reset a vanished selection while a refetch is in flight', () => {
      // The transient stale-cache emit during a rename refetch drops the old name from
      // the list; the selection must NOT snap to the first tab (the "jump to front"
      // flash) while loading — only once the network settles.
      const wrapper = Wrapper()
      wrapper.vm.setActive('badge-setter')
      wrapper.vm.$apollo.queries = { roles: { loading: true } }
      // Simulate the stale emit: the list momentarily lacks the selected role.
      wrapper.setData({
        roles: [
          { name: 'owner', protected: true, permissions: [], memberCount: 1 },
          { name: 'user', protected: false, permissions: ['post.create'], memberCount: 5 },
        ],
      })
      wrapper.vm.ensureActive()
      expect(wrapper.vm.activeRoleName).toBe('badge-setter') // held, not reset to 'user'
      // Once the network has settled and the role is genuinely gone, fall back.
      wrapper.vm.$apollo.queries.roles.loading = false
      wrapper.vm.ensureActive()
      expect(wrapper.vm.activeRoleName).toBe('user')
    })

    it('starting a rename cancels create mode (and vice versa)', () => {
      const wrapper = Wrapper()
      wrapper.vm.startCreate()
      expect(wrapper.vm.creating).toBe(true)
      wrapper.vm.startRename()
      expect(wrapper.vm.creating).toBe(false)
      expect(wrapper.vm.renaming).toBe(true)
      wrapper.vm.startCreate()
      expect(wrapper.vm.renaming).toBe(false)
      expect(wrapper.vm.creating).toBe(true)
    })
  })
})

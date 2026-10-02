import { mount } from '@vue/test-utils'

import rights from './rights.vue'

const localVue = global.localVue

const CATALOG = [
  // The two rights the visibility is derived from. Without them in the catalog the outsider
  // switches are not grantable, and the rows that decide whether a group is secret or public
  // could not be exercised at all.
  {
    key: 'group.read',
    group: 'visibility',
    description: "See the group's profile.",
    gatedBy: [],
    requiresNetworkPermission: null,
  },
  {
    key: 'group.content.read',
    group: 'visibility',
    description: "Read the group's posts.",
    gatedBy: [],
    requiresNetworkPermission: null,
  },
  {
    key: 'group.post.create',
    group: 'content',
    description: 'Create posts in the group.',
    gatedBy: [],
    requiresNetworkPermission: 'post.create',
  },
  {
    key: 'group.comment.create',
    group: 'content',
    description: 'Comment on posts in the group.',
    gatedBy: [],
    requiresNetworkPermission: 'comment.create',
  },
  {
    key: 'group.leave',
    group: 'membership',
    description: 'Leave the group.',
    gatedBy: [],
    requiresNetworkPermission: null,
  },
  {
    key: 'group.members.read',
    group: 'visibility',
    description: 'See the member list.',
    gatedBy: [],
    requiresNetworkPermission: null,
  },
  {
    key: 'group.videoCall.create',
    group: 'communication',
    description: 'Open a video call.',
    gatedBy: ['videoConference'],
    requiresNetworkPermission: 'videoCall.create_<door>',
  },
]

const ROLES = [
  { name: 'none', label: null, system: true, protected: false, permissions: [], memberCount: null },
  {
    name: 'pending',
    label: null,
    system: true,
    protected: false,
    permissions: [],
    memberCount: 1,
  },
  {
    name: 'usual',
    label: null,
    system: true,
    protected: false,
    permissions: ['group.post.create', 'group.members.read'],
    memberCount: 4,
  },
  {
    name: 'owner',
    label: null,
    system: true,
    protected: true,
    permissions: [],
    memberCount: 1,
  },
]

describe('rights.vue', () => {
  let mocks

  // Everything the owner holds — the page must not offer a right the editor lacks, so the
  // "held" set is what decides which rows are editable.
  const held = [
    'group.role.manage',
    'group.read',
    'group.content.read',
    'group.post.create',
    'group.comment.create',
    'group.members.read',
  ]

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)),
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: {
            updateGroupRole: {
              name: 'usual',
              label: null,
              system: true,
              protected: false,
              permissions: ['group.members.read'],
              memberCount: 4,
            },
          },
        }),
      },
      $toast: { success: jest.fn(), error: jest.fn() },
      localVue,
    }
  })

  // The page fills itself from one query; the spec sets the same state the query's result hook
  // would set, which keeps the assertions about the UI rather than about apollo's plumbing.
  const Wrapper = async (myGroupPermissions = held) => {
    const wrapper = mount(rights, {
      localVue,
      mocks,
      propsData: { group: { id: 'group-1', name: 'Group One' } },
      stubs: {
        'os-card': { template: '<div><slot /></div>' },
        'os-button': {
          template: '<button :disabled="disabled" v-on="$listeners"><slot /></button>',
          props: ['disabled'],
        },
      },
    })
    wrapper.setData({
      catalog: CATALOG,
      roles: ROLES,
      myGroupPermissions,
      draftPermissions: ROLES.find((role) => role.name === 'usual').permissions,
    })
    await wrapper.vm.$nextTick()
    return wrapper
  }

  const at = (wrapper, testId) => wrapper.find(`[data-test="${testId}"]`)

  it('starts in the simple view, one sentence per question', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'rights-simple').exists()).toBe(true)
    expect(at(wrapper, 'switch-members-post').exists()).toBe(true)
    expect(at(wrapper, 'switch-nonmembers-members').exists()).toBe(true)
    // The matrix is reachable but is not the entry point.
    expect(at(wrapper, 'rights-advanced').exists()).toBe(false)
  })

  describe('the simple view can reach every visibility', () => {
    // Both directions were unreachable: `group.read` sat on no switch, so whatever was ticked
    // the group could never become public — and whatever was UNticked it never became secret
    // either, because nothing took that right away again.
    const noneRoleAfter = (wrapper) => {
      const call = mocks.$apollo.mutate.mock.calls.at(-1)[0]
      return call.variables.permissions
    }

    it('makes the group secret when the last outsider right is taken away', async () => {
      const wrapper = await Wrapper()
      wrapper.setData({
        roles: ROLES.map((role) =>
          role.name === 'none'
            ? { ...role, permissions: ['group.read', 'group.content.read', 'group.members.read'] }
            : role,
        ),
      })
      await wrapper.vm.$nextTick()

      await at(wrapper, 'switch-nonmembers-profile').setChecked(false)

      // The dependants go with it: reading the posts of a group one cannot see is not a state.
      expect(noneRoleAfter(wrapper)).toEqual([])
    })

    it('makes the group public when the posts are opened, without a second tick', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(noneRoleAfter(wrapper)).toEqual(['group.content.read', 'group.read'])
    })
  })

  describe('the resulting group type', () => {
    // The type is not a separate choice any more: these two non-member rights ARE the choice,
    // so the page has to name the result while they are being ticked.
    it('names what the stored non-member rights make the group', async () => {
      // In the simple view that statement is the shared card, which the admin template page
      // shows as well — one derivation, so the two screens cannot disagree.
      const wrapper = await Wrapper()

      expect(at(wrapper, 'visibility-title').text()).toContain('group.types.hidden')
    })

    it('reads the unsaved draft while the non-member role is the one being edited', async () => {
      // The matrix view only: there the `none` role is editable, so the answer has to follow the
      // DRAFT. The simple view saves each tick straight away and reads the stored roles.
      const wrapper = await Wrapper()
      wrapper.setData({ advanced: true })
      await wrapper.vm.$nextTick()

      // Switching the tab reloads the draft from the role, so the draft is set afterwards —
      // the same order a click and a tick produce.
      wrapper.setData({ activeRoleName: 'none' })
      await wrapper.vm.$nextTick()
      wrapper.setData({ draftPermissions: ['group.read', 'group.content.read'] })
      await wrapper.vm.$nextTick()

      expect(at(wrapper, 'resulting-type').text()).toContain('group.types.public')

      wrapper.setData({ draftPermissions: ['group.read'] })
      await wrapper.vm.$nextTick()

      expect(at(wrapper, 'resulting-type').text()).toContain('group.types.closed')
    })
  })

  it('reflects what a role currently grants', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'switch-members-post').element.checked).toBe(true)
    expect(at(wrapper, 'switch-members-comment').element.checked).toBe(false)
  })

  it('puts a switch back when the write is refused', async () => {
    // A rejected mutation leaves the DOM checkbox where the click put it, which reads as "the
    // group has this right now" — while the server said no.
    mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Not Authorized!'))
    const wrapper = await Wrapper()
    const forceUpdate = jest.spyOn(wrapper.vm, '$forceUpdate')

    at(wrapper, 'switch-members-post').element.checked = false
    await at(wrapper, 'switch-members-post').trigger('change')
    await wrapper.vm.$nextTick()

    expect(mocks.$toast.error).toHaveBeenCalled()
    expect(forceUpdate).toHaveBeenCalled()
  })

  it('writes a single right when a switch is flipped', async () => {
    const wrapper = await Wrapper()

    at(wrapper, 'switch-members-post').element.checked = false
    at(wrapper, 'switch-members-post').trigger('change')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          groupId: 'group-1',
          name: 'usual',
          // The one right disappears, everything else the role had stays.
          permissions: ['group.members.read'],
        }),
      }),
    )
  })

  it('does not offer a right the editor does not hold', async () => {
    // A right the actor lacks cannot be granted (the backend refuses it), so the switch is
    // inert rather than promising an effect.
    const wrapper = await Wrapper(['group.role.manage', 'group.post.create'])

    expect(at(wrapper, 'switch-nonmembers-members').element.disabled).toBe(true)
    expect(at(wrapper, 'switch-members-post').element.disabled).toBe(false)
  })

  it('keeps everything read-only without group.role.manage', async () => {
    const wrapper = await Wrapper(['group.post.create'])

    expect(at(wrapper, 'switch-members-post').element.disabled).toBe(true)
    expect(at(wrapper, 'preset-channel').element.disabled).toBe(true)
  })

  describe('hover diff in the matrix', () => {
    // Same affordance as the network and template role pages: hovering a role tab marks what
    // that role would change about the one being edited.
    const classesOf = (wrapper, key) =>
      at(wrapper, `perm-${key}`).element.closest('label').className

    const advanced = async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      return wrapper
    }

    it('marks both directions against the role being edited', async () => {
      const wrapper = await advanced()

      // Active role is `usual` (posting + member list), hovered is `none` (nothing).
      await at(wrapper, 'role-tab-none').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.post.create')).toContain('perm-row--removed')
      expect(classesOf(wrapper, 'group.comment.create')).not.toContain('perm-row--added')
    })

    it('clears the marks when the cursor leaves', async () => {
      const wrapper = await advanced()

      await at(wrapper, 'role-tab-none').trigger('mouseenter')
      await at(wrapper, 'role-tab-none').trigger('mouseleave')

      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
    })

    it('reads the protected owner role as the whole catalog', async () => {
      const wrapper = await advanced()

      await at(wrapper, 'role-tab-owner').trigger('mouseenter')

      // The owner tab shows the explanatory note instead of the matrix, so the hover is read
      // from the role it would be compared against — the rows are gone, the state is not.
      expect(wrapper.vm.hoverDiff['group.comment.create']).toBe('added')
    })
  })

  it('locks the right to leave on a membership role instead of offering it', async () => {
    // A group whose members cannot leave it would need somebody else to let them out, so the
    // box is ticked and inert rather than a choice (see groupRole/mandatoryRights.ts).
    const wrapper = await Wrapper()
    await at(wrapper, 'to-advanced').trigger('click')

    const leave = at(wrapper, 'perm-group.leave')

    expect(leave.attributes('disabled')).toBeDefined()
  })

  it('greys the right to leave on the non-member role, which has nothing to leave', async () => {
    const wrapper = await Wrapper()
    await at(wrapper, 'to-advanced').trigger('click')
    await at(wrapper, 'role-tab-none').trigger('click')

    const leave = at(wrapper, 'perm-group.leave')

    expect(leave.attributes('disabled')).toBeDefined()
    expect(leave.element.checked).toBe(false)
  })

  it('lets the owner role be renamed although its rights are fixed', async () => {
    // The owner holds the whole catalog — but "Owner" is just what this group calls the
    // person, and the save button used to be hidden for exactly that role.
    const wrapper = await Wrapper()
    await at(wrapper, 'to-advanced').trigger('click')
    await at(wrapper, 'role-tab-owner').trigger('click')

    await at(wrapper, 'role-label').find('input').setValue('Guardian')

    expect(at(wrapper, 'save').element.disabled).toBe(false)

    await at(wrapper, 'save').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ name: 'owner', label: 'Guardian', permissions: [] }),
      }),
    )
  })

  it('shows the matrix on demand, with the owner role explained rather than editable', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'to-advanced').trigger('click')
    expect(at(wrapper, 'rights-advanced').exists()).toBe(true)

    await at(wrapper, 'role-tab-owner').trigger('click')
    expect(at(wrapper, 'owner-note').exists()).toBe(true)
    expect(at(wrapper, 'perm-group.post.create').exists()).toBe(false)
  })

  it('turns the group into a channel in one action', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'preset-channel').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          name: 'usual',
          // Members keep reading and everything else; writing is what goes.
          permissions: ['group.members.read'],
        }),
      }),
    )
  })

  describe('the advanced view', () => {
    const advanced = async (permissions) => {
      const wrapper = await Wrapper(permissions)
      await at(wrapper, 'to-advanced').trigger('click')
      return wrapper
    }

    it('edits and saves the permission set of a role', async () => {
      const wrapper = await advanced()

      at(wrapper, 'perm-group.comment.create').element.checked = true
      await at(wrapper, 'perm-group.comment.create').trigger('change')
      await at(wrapper, 'save').trigger('click')

      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            name: 'usual',
            permissions: ['group.post.create', 'group.members.read', 'group.comment.create'],
          }),
        }),
      )
    })

    it('reverts a draft without saving', async () => {
      const wrapper = await advanced()

      at(wrapper, 'perm-group.comment.create').element.checked = true
      await at(wrapper, 'perm-group.comment.create').trigger('change')
      expect(wrapper.vm.dirty).toBe(true)

      await at(wrapper, 'revert').trigger('click')

      expect(wrapper.vm.dirty).toBe(false)
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })

    it('leaves a right the editor lacks inert', async () => {
      const wrapper = await advanced(['group.role.manage', 'group.post.create'])

      expect(at(wrapper, 'perm-group.members.read').element.disabled).toBe(true)
      expect(at(wrapper, 'perm-group.post.create').element.disabled).toBe(false)
    })

    it('offers no delete button for a system role', async () => {
      // none, pending, usual and owner exist because the code depends on them.
      const wrapper = await advanced()

      expect(at(wrapper, 'role-delete').exists()).toBe(false)
    })

    it('adds a role, starting from what a member may do', async () => {
      mocks.$apollo.mutate = jest.fn().mockResolvedValue({
        data: {
          createGroupRole: {
            name: 'editors',
            label: 'Redaktion',
            system: false,
            protected: false,
            permissions: ['group.post.create'],
            memberCount: 0,
          },
        },
      })
      const wrapper = await advanced()

      await at(wrapper, 'role-add').trigger('click')
      at(wrapper, 'new-role-name').find('input').setValue('editors')
      at(wrapper, 'new-role-label').find('input').setValue('Redaktion')
      await at(wrapper, 'role-create').trigger('submit')

      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            name: 'editors',
            label: 'Redaktion',
            // A member plus something is the usual reason to add a role at all.
            permissions: ['group.post.create', 'group.members.read'],
          }),
        }),
      )
      expect(wrapper.vm.activeRoleName).toBe('editors')
    })

    it('leaves out a member right the creator cannot grant right now', async () => {
      // The refusal this fixes: the member role legitimately holds rights that are capped away
      // for the person adding a role — a network cap takes `group.videoCall.create` out of
      // everybody's effective set in a group whose door is restricted — and copying those made
      // the server answer "you cannot grant rights you do not hold yourself" every time.
      mocks.$apollo.mutate = jest.fn().mockResolvedValue({
        data: {
          createGroupRole: {
            name: 'editors',
            label: null,
            system: false,
            protected: false,
            permissions: ['group.post.create'],
            memberCount: 0,
          },
        },
      })
      const wrapper = await advanced(['group.role.manage', 'group.post.create'])

      await at(wrapper, 'role-add').trigger('click')
      at(wrapper, 'new-role-name').find('input').setValue('editors')
      await at(wrapper, 'role-create').trigger('submit')

      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ permissions: ['group.post.create'] }),
        }),
      )
    })

    it('deletes a role it created, moving its members to the member role', async () => {
      window.confirm = jest.fn().mockReturnValue(true)
      const wrapper = await advanced()
      wrapper.setData({
        roles: [
          ...ROLES,
          {
            name: 'editors',
            label: null,
            system: false,
            protected: false,
            permissions: [],
            memberCount: 2,
          },
        ],
        activeRoleName: 'editors',
      })
      await wrapper.vm.$nextTick()

      await at(wrapper, 'role-delete').trigger('click')

      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { groupId: 'group-1', name: 'editors', reassignTo: 'usual' },
        }),
      )
      delete window.confirm
    })

    it('resets the roles to the network template after asking', async () => {
      window.confirm = jest.fn().mockReturnValue(true)
      mocks.$apollo.mutate = jest.fn().mockResolvedValue({
        data: { resetGroupRoles: ROLES },
      })
      const wrapper = await Wrapper()

      await at(wrapper, 'reset').trigger('click')
      await wrapper.vm.$nextTick()

      expect(window.confirm).toHaveBeenCalled()
      expect(mocks.$apollo.mutate).toHaveBeenCalled()
      delete window.confirm
    })

    it('does not reset when the question is declined', async () => {
      window.confirm = jest.fn().mockReturnValue(false)
      const wrapper = await Wrapper()

      await at(wrapper, 'reset').trigger('click')

      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      delete window.confirm
    })

    it('toasts a save error', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'refused' })
      const wrapper = await advanced()

      at(wrapper, 'perm-group.comment.create').element.checked = true
      await at(wrapper, 'perm-group.comment.create').trigger('change')
      await at(wrapper, 'save').trigger('click')
      await wrapper.vm.$nextTick()

      expect(mocks.$toast.error).toHaveBeenCalledWith('refused')
    })
  })
})

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
    groupCount: 7,
    roles: [
      role('none', ['group.members.read']),
      role('usual', ['group.post.create']),
      role('owner', [], { protected: true }),
    ],
  },
  {
    groupType: 'closed',
    untouchedGroupCount: 0,
    groupCount: 2,
    // Deliberately different from the public template's `usual`: that difference is what a
    // hover over the type tab is supposed to show.
    roles: [role('none', []), role('usual', ['group.members.read'])],
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

  describe('hover diff', () => {
    // Same affordance as the network roles page: hovering a role tab marks what that role
    // would change about the one being edited, instead of making an admin compare by eye.
    const classesOf = (wrapper, key) =>
      at(wrapper, `perm-${key}`).element.closest('label').className

    it('marks both directions against the role being edited', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'role-tab-none').trigger('mouseenter')

      // Active role is `usual` (posting only), hovered is `none` (member list only).
      expect(classesOf(wrapper, 'group.post.create')).toContain('perm-row--removed')
      expect(classesOf(wrapper, 'group.members.read')).toContain('perm-row--added')
    })

    it('clears the marks when the cursor leaves', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'role-tab-none').trigger('mouseenter')
      await at(wrapper, 'role-tab-none').trigger('mouseleave')

      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
      expect(classesOf(wrapper, 'group.members.read')).not.toContain('perm-row--added')
    })

    it('previews the SAME role in another type when a type tab is hovered', async () => {
      // The question the three presets exist to answer: what does a closed group's member
      // role do differently from a public one's?
      const wrapper = await Wrapper()

      await at(wrapper, 'type-tab-closed').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.members.read')).toContain('perm-row--added')
      expect(classesOf(wrapper, 'group.post.create')).toContain('perm-row--removed')
    })

    it('clears a type preview when the cursor leaves', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'type-tab-closed').trigger('mouseenter')
      await at(wrapper, 'type-tab-closed').trigger('mouseleave')

      expect(classesOf(wrapper, 'group.members.read')).not.toContain('perm-row--added')
    })

    it('shows nothing for the type that is already open', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'type-tab-public').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
    })

    it('reads the protected owner role as the whole catalog', async () => {
      // `owner` stores no permission list at all — hovering it must read as "everything",
      // not as an empty role that would appear to strip the matrix.
      const wrapper = await Wrapper()

      await at(wrapper, 'role-tab-owner').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.members.read')).toContain('perm-row--added')
      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
    })
  })

  it('reads the untouched count as a share of the type`s groups', async () => {
    // A bare "4 groups still run on this template" reads as "only 4" — the denominator is
    // what tells an admin whether that is all of them.
    const wrapper = await Wrapper()

    expect(at(wrapper, 'untouched').text()).toContain('"untouched":4')
    expect(at(wrapper, 'untouched').text()).toContain('"total":7')
  })

  it('renames a template role without touching its rights', async () => {
    // Every new group copies the label, so naming `usual` "Mitglied" here is a one-place change
    // instead of a per-group chore — and the owner role has nothing but its name to edit.
    const wrapper = await Wrapper()

    await at(wrapper, 'role-label-input').setValue('Mitglied')
    await at(wrapper, 'save').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ name: 'usual', label: 'Mitglied' }),
      }),
    )
  })

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
    expect(wrapper.vm.draft).toEqual(['group.members.read'])
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

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

// The `none` role carries the rights the visibility is DERIVED from, so these fixtures have to
// be internally consistent: a template claiming `visibility: 'public'` whose non-member role
// cannot even read the profile is a state the server never produces, and a screen built on it
// would be tested against a fiction.
const TEMPLATES = [
  {
    name: 'public',
    visibility: 'public',
    untouchedGroupCount: 4,
    groupCount: 7,
    roles: [
      role('none', ['group.read', 'group.content.read', 'group.members.read']),
      role('usual', ['group.post.create']),
      role('owner', [], { protected: true }),
    ],
  },
  {
    name: 'closed',
    visibility: 'closed',
    untouchedGroupCount: 0,
    groupCount: 2,
    // The `usual` role is deliberately different from the public template's: that difference is
    // what a hover over the template tab is supposed to show.
    roles: [role('none', ['group.read']), role('usual', ['group.members.read'])],
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

  // The matrix lives behind the same "advanced" step the group's own rights page has: the two
  // halves edit the same roles, and showing both at once meant two drafts over one set of data.
  const advanced = async () => {
    const wrapper = await Wrapper()
    await at(wrapper, 'to-advanced').trigger('click')
    return wrapper
  }

  describe('hover diff', () => {
    // Same affordance as the network roles page: hovering a role tab marks what that role
    // would change about the one being edited, instead of making an admin compare by eye.
    const classesOf = (wrapper, key) =>
      at(wrapper, `perm-${key}`).element.closest('label').className

    it('marks both directions against the role being edited', async () => {
      const wrapper = await advanced()

      await at(wrapper, 'role-tab-none').trigger('mouseenter')

      // Active role is `usual` (posting only), hovered is `none` (member list only).
      expect(classesOf(wrapper, 'group.post.create')).toContain('perm-row--removed')
      expect(classesOf(wrapper, 'group.members.read')).toContain('perm-row--added')
    })

    it('clears the marks when the cursor leaves', async () => {
      const wrapper = await advanced()

      await at(wrapper, 'role-tab-none').trigger('mouseenter')
      await at(wrapper, 'role-tab-none').trigger('mouseleave')

      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
      expect(classesOf(wrapper, 'group.members.read')).not.toContain('perm-row--added')
    })

    it('previews the SAME role in another template when its tab is hovered', async () => {
      // The question the three presets exist to answer: what does a closed group's member
      // role do differently from a public one's?
      const wrapper = await advanced()

      await at(wrapper, 'type-tab-closed').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.members.read')).toContain('perm-row--added')
      expect(classesOf(wrapper, 'group.post.create')).toContain('perm-row--removed')
    })

    it('clears a type preview when the cursor leaves', async () => {
      const wrapper = await advanced()

      await at(wrapper, 'type-tab-closed').trigger('mouseenter')
      await at(wrapper, 'type-tab-closed').trigger('mouseleave')

      expect(classesOf(wrapper, 'group.members.read')).not.toContain('perm-row--added')
    })

    it('shows nothing for the type that is already open', async () => {
      const wrapper = await advanced()

      await at(wrapper, 'type-tab-public').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
    })

    it('reads the protected owner role as the whole catalog', async () => {
      // `owner` stores no permission list at all — hovering it must read as "everything",
      // not as an empty role that would appear to strip the matrix.
      const wrapper = await advanced()

      await at(wrapper, 'role-tab-owner').trigger('mouseenter')

      expect(classesOf(wrapper, 'group.members.read')).toContain('perm-row--added')
      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--removed')
    })
  })

  it('reads the untouched count as a share of the type`s groups', async () => {
    // A bare "4 groups still run on this template" reads as "only 4" — the denominator is
    // what tells an admin whether that is all of them.
    const wrapper = await advanced()

    expect(at(wrapper, 'untouched').text()).toContain('"untouched":4')
    expect(at(wrapper, 'untouched').text()).toContain('"total":7')
  })

  it('renames a template role without touching its rights', async () => {
    // Every new group copies the label, so naming `usual` "Mitglied" here is a one-place change
    // instead of a per-group chore — and the owner role has nothing but its name to edit.
    const wrapper = await advanced()

    await at(wrapper, 'role-label').find('input').setValue('Mitglied')
    await at(wrapper, 'save').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ name: 'usual', label: 'Mitglied' }),
      }),
    )
  })

  it('writes the template role the SENTENCE is about, once the draft is saved', async () => {
    // Not the role the matrix tabs happen to have selected — and not on the tick either: the
    // simple view collects a draft and writes it when somebody says so.
    const wrapper = await advanced()

    await at(wrapper, 'switch-members-post').setChecked(false)

    expect(mocks.$apollo.mutate).not.toHaveBeenCalled()

    await at(wrapper, 'simple-save').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          template: 'public',
          name: 'usual',
          permissions: [],
        }),
      }),
    )
  })

  it('does not open the matrix while the simple view has an unsaved draft', async () => {
    // The two halves are mutually exclusive now rather than mutually locked — so the way INTO
    // the matrix is what has to refuse, or the draft would be thrown away on the way.
    const wrapper = await Wrapper()

    await at(wrapper, 'switch-members-post').setChecked(false)

    expect(at(wrapper, 'to-advanced').attributes('disabled')).toBeTruthy()
  })

  it('does not leave the matrix while ITS draft is unsaved', async () => {
    const wrapper = await advanced()

    wrapper.setData({ draft: ['group.post.create', 'group.members.read'] })
    await wrapper.vm.$nextTick()

    expect(at(wrapper, 'to-simple').attributes('disabled')).toBeTruthy()
  })

  it('calls the roles what the group screen calls them, not by their keys', async () => {
    // Same five roles, same vocabulary. The template page used to print the bare key while the
    // group's own rights page printed the translated name — one component, two call sites, two
    // answers. Asserted by the translation being CONSULTED: this spec's `$t` echoes the key, so
    // the rendered text falls back to the key either way and would prove nothing.
    await advanced()

    expect(mocks.$t).toHaveBeenCalledWith('group.roles.usual')
    expect(mocks.$t).toHaveBeenCalledWith('group.roles.none')
  })

  it('offers one tab per template, names the visibility it produces, and starts on public', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'type-tab-public').exists()).toBe(true)
    expect(at(wrapper, 'type-tab-closed').exists()).toBe(true)
    expect(wrapper.vm.activeTemplateName).toBe('public')
    // Derived from the template's own non-member role by the shared card — the same statement a
    // group gets about itself, rather than a second implementation that can disagree.
    expect(at(wrapper, 'visibility-title').text()).toContain('group.types.public')
  })

  it('follows the template under the tabs rather than the tab that is called public', async () => {
    // The tab name is a KEY, the card is a CONSEQUENCE. A template whose non-member role was
    // opened or closed keeps its name and changes what it produces, and the two must not be
    // read as one thing.
    const wrapper = await Wrapper()

    await at(wrapper, 'type-tab-closed').trigger('click')

    expect(at(wrapper, 'visibility-title').text()).toContain('group.types.closed')
  })

  it('says how many groups still run on the template untouched', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'untouched').text()).toContain('4')
  })

  it('switches the roles when the group type changes', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'type-tab-closed').trigger('click')

    expect(wrapper.vm.activeTemplate.name).toBe('closed')
    // The draft follows the type, so an edit cannot leak from one template into another.
    expect(wrapper.vm.draft).toEqual(['group.members.read'])
    expect(at(wrapper, 'apply').element.disabled).toBe(true)
  })

  it('explains the owner role rather than offering checkboxes', async () => {
    const wrapper = await advanced()

    await at(wrapper, 'role-tab-owner').trigger('click')

    expect(at(wrapper, 'owner-note').exists()).toBe(true)
    expect(at(wrapper, 'perm-group.post.create').exists()).toBe(false)
  })

  it('saves a changed permission set', async () => {
    const wrapper = await advanced()

    at(wrapper, 'perm-group.members.read').element.checked = true
    await at(wrapper, 'perm-group.members.read').trigger('change')
    expect(wrapper.vm.dirty).toBe(true)

    await at(wrapper, 'save').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          template: 'public',
          name: 'usual',
          permissions: ['group.post.create', 'group.members.read'],
        }),
      }),
    )
    expect(mocks.$toast.success).toHaveBeenCalled()
  })

  it('reverts a draft', async () => {
    const wrapper = await advanced()

    at(wrapper, 'perm-group.members.read').element.checked = true
    await at(wrapper, 'perm-group.members.read').trigger('change')
    await at(wrapper, 'revert').trigger('click')

    expect(wrapper.vm.dirty).toBe(false)
    expect(wrapper.vm.draft).toEqual(['group.post.create'])
  })

  it('toasts a save error', async () => {
    mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'nope' })
    const wrapper = await advanced()

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
      const wrapper = await advanced()

      await at(wrapper, 'apply').trigger('click')
      await wrapper.vm.$nextTick()

      expect(window.confirm).toHaveBeenCalled()
      expect(mocks.$toast.success).toHaveBeenCalledWith(
        expect.stringContaining('admin.groupRoles.applied'),
      )
    })

    it('does nothing when declined', async () => {
      window.confirm = jest.fn().mockReturnValue(false)
      const wrapper = await advanced()

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

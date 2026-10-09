import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'

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

// What each template would put on the group. `closed` differs from the fixture's roles in two
// places: outsiders may see the profile, and members may comment.
const withPermissions = (changes) =>
  ROLES.map((role) => (changes[role.name] ? { ...role, permissions: changes[role.name] } : role))
const TEMPLATES = [
  { name: 'public', roles: ROLES },
  {
    name: 'closed',
    roles: withPermissions({
      none: ['group.read'],
      usual: ['group.post.create', 'group.members.read', 'group.comment.create'],
    }),
  },
  { name: 'hidden', roles: ROLES },
  { name: 'channel', roles: ROLES },
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
      // `template` is which preset the group runs on — the active tab in the picker, and what
      // "you are already on this one" is checked against.
      propsData: { group: { id: 'group-1', name: 'Group One', template: 'public' } },
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
      templates: TEMPLATES,
      roles: ROLES,
      myGroupPermissions,
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
    // What the SAVE wrote for the non-member role. Each tick is a draft now; nothing reaches
    // the server until somebody presses save.
    const noneRoleAfter = async (wrapper) => {
      await at(wrapper, 'save').trigger('click')
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
      expect(await noneRoleAfter(wrapper)).toEqual([])
    })

    it('makes the group public when the posts are opened, without a second tick', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(await noneRoleAfter(wrapper)).toEqual(['group.content.read', 'group.read'])
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

    it("reads the matrix's unsaved ticks, because both views edit one draft", async () => {
      // The card is the one statement of what the group is, so it has to follow every edit —
      // a card still saying "hidden" over a ticked, unsaved `group.read` is the one place this
      // page could contradict itself.
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      await at(wrapper, 'role-tab-none').trigger('click')

      await at(wrapper, 'perm-group.read').setChecked(true)

      expect(at(wrapper, 'visibility-title').text()).toContain('group.types.closed')
      expect(at(wrapper, 'switch-nonmembers-profile').element.checked).toBe(true)
    })

    it('closes the implications in the matrix as the sentences do', async () => {
      // Reading the posts cannot be held without seeing the group: ticking the one brings the
      // other, and unticking the group takes what depended on it — or the server would put it
      // back and the untick would look like it did nothing.
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      await at(wrapper, 'role-tab-none').trigger('click')

      await at(wrapper, 'perm-group.content.read').setChecked(true)

      expect(at(wrapper, 'perm-group.read').element.checked).toBe(true)

      await at(wrapper, 'perm-group.read').setChecked(false)

      expect(at(wrapper, 'perm-group.content.read').element.checked).toBe(false)
    })
  })

  describe('what a hovered control points at', () => {
    const classesOf = (wrapper, key) =>
      at(wrapper, `perm-${key}`).element.closest('label').className

    it('marks the rights a sentence means, on the role it means them for', async () => {
      const wrapper = await Wrapper()
      wrapper.setData({ advanced: true, activeRoleName: 'none' })
      await wrapper.vm.$nextTick()

      await at(wrapper, 'switch-row-nonmembers-read').trigger('mouseenter')

      // Through the implication: reading the posts cannot be held without seeing the group.
      expect(classesOf(wrapper, 'group.content.read')).toContain('perm-row--touched')
      expect(classesOf(wrapper, 'group.read')).toContain('perm-row--touched')
      expect(classesOf(wrapper, 'group.post.create')).not.toContain('perm-row--touched')
      expect(at(wrapper, 'role-tab-none').classes()).toContain(
        'os-toggle-group__option--highlighted',
      )
    })

    it('marks what a template would change — sentences, states and role tabs', async () => {
      // Putting a template on replaces every role, so what it would change has to be readable
      // before the click: here, outsiders gain the profile and members gain comments.
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')

      await at(wrapper, 'template-closed').trigger('mouseenter')

      expect(at(wrapper, 'switch-row-nonmembers-profile').classes()).toContain('switch--will-added')
      expect(at(wrapper, 'switch-row-members-comment').classes()).toContain('switch--will-added')
      expect(at(wrapper, 'switch-row-members-post').classes()).toEqual(['switch'])
      expect(at(wrapper, 'visibility-next').text()).toContain('group.types.closed')
      expect(at(wrapper, 'role-tab-none').classes()).toContain(
        'os-toggle-group__option--highlighted',
      )
      expect(at(wrapper, 'role-tab-pending').classes()).not.toContain(
        'os-toggle-group__option--highlighted',
      )
      // The matrix of the role on screen says added or removed, as for a hovered role.
      expect(classesOf(wrapper, 'group.comment.create')).toContain('perm-row--added')

      await at(wrapper, 'template-closed').trigger('mouseleave')

      expect(wrapper.findAll('.os-toggle-group__option--highlighted')).toHaveLength(0)
      expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
    })

    it('marks nothing for the template the group already matches', async () => {
      const wrapper = await Wrapper()

      await at(wrapper, 'template-public').trigger('mouseenter')

      expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
      expect(wrapper.findAll('.state--changes')).toHaveLength(0)
    })

    it('points from a matrix row back at its sentence and the state it decides', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      await at(wrapper, 'role-tab-none').trigger('click')

      const row = wrapper
        .findAll('.perm-row')
        .filter((candidate) => candidate.find('[data-test="perm-group.read"]').exists())
      await row.at(0).trigger('mouseenter')

      // What ticking that row would do, said in the sentences' own terms.
      expect(at(wrapper, 'switch-row-nonmembers-profile').classes()).toContain('switch--will-added')
      expect(at(wrapper, 'visibility-next').text()).toContain('group.types.closed')

      await row.at(0).trigger('mouseleave')

      expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
    })

    it('previews an untick from a matrix row whose right is held', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      const row = wrapper
        .findAll('.perm-row')
        .filter((candidate) => candidate.find('[data-test="perm-group.post.create"]').exists())

      await row.at(0).trigger('mouseenter')

      expect(at(wrapper, 'switch-row-members-post').classes()).toContain('switch--will-removed')
    })

    it('previews nothing from a matrix row that cannot be ticked', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      const row = wrapper
        .findAll('.perm-row')
        .filter((candidate) => candidate.find('[data-test="perm-group.leave"]').exists())

      await row.at(0).trigger('mouseenter')

      expect(wrapper.vm.previewRoles).toBeNull()
    })

    it('points from the door at the applicants, who exist only behind one', async () => {
      const wrapper = await Wrapper()
      wrapper.setData({ roles: withPermissions({ none: ['group.read'] }) })
      await wrapper.vm.$nextTick()
      await at(wrapper, 'to-advanced').trigger('click')

      await at(wrapper, 'admission-option-onRequest').trigger('mouseenter')

      expect(at(wrapper, 'admission-next').exists()).toBe(true)
      expect(at(wrapper, 'role-tab-pending').classes()).toContain(
        'os-toggle-group__option--highlighted',
      )
    })
  })

  it('reflects what a role currently grants', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'switch-members-post').element.checked).toBe(true)
    expect(at(wrapper, 'switch-members-comment').element.checked).toBe(false)
  })

  it('reports a refused write instead of leaving the screen claiming it worked', async () => {
    mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Not Authorized!'))
    const wrapper = await Wrapper()

    await at(wrapper, 'switch-members-post').setChecked(false)
    await at(wrapper, 'save').trigger('click')
    await wrapper.vm.$nextTick()

    expect(mocks.$toast.error).toHaveBeenCalled()
  })

  it('writes a single right when a switch is flipped and the draft is saved', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'switch-members-post').setChecked(false)
    await at(wrapper, 'save').trigger('click')

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

  describe('one draft for both views', () => {
    // The sentences and the matrix used to keep a draft each, and each locked the other while
    // it held one — whichever saved second would have thrown the other's edit away. One draft
    // makes the lock unnecessary.
    it('keeps the matrix editable while a sentence holds an unsaved edit', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'switch-members-post').setChecked(false)
      await at(wrapper, 'to-advanced').trigger('click')

      expect(at(wrapper, 'perm-group.comment.create').element.disabled).toBe(false)
      // …and the matrix shows the sentence's edit, because it is the same draft.
      expect(at(wrapper, 'perm-group.post.create').element.checked).toBe(false)
    })

    describe('when the query comes back again', () => {
      const refetched = (wrapper) =>
        rights.apollo.rights.result.call(wrapper.vm, {
          loading: false,
          data: {
            groupPermissionCatalog: CATALOG,
            groupTemplates: TEMPLATES,
            Group: [{ roles: ROLES, myGroupPermissions: held }],
          },
        })

      it('keeps the unsaved edit', async () => {
        const wrapper = await Wrapper()
        await at(wrapper, 'switch-members-post').setChecked(false)

        refetched(wrapper)
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.dirty).toBe(true)
        expect(at(wrapper, 'switch-members-post').element.checked).toBe(false)
      })

      it('follows the server while nothing is edited', async () => {
        const wrapper = await Wrapper()
        const resetDraft = jest.spyOn(wrapper.vm, 'resetDraft')

        refetched(wrapper)

        expect(resetDraft).toHaveBeenCalled()
      })
    })

    it('keeps an edit when another role is opened, and the tab says so', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      await at(wrapper, 'perm-group.comment.create').setChecked(true)

      await at(wrapper, 'role-tab-none').trigger('click')

      expect(at(wrapper, 'role-tab-drafted-usual').exists()).toBe(true)
      expect(at(wrapper, 'role-tab-drafted-none').exists()).toBe(false)

      await at(wrapper, 'role-tab-usual').trigger('click')

      expect(at(wrapper, 'perm-group.comment.create').element.checked).toBe(true)
    })

    it('drops a role from the draft once its edit is undone by hand', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'switch-members-comment').setChecked(true)
      await at(wrapper, 'switch-members-comment').setChecked(false)

      expect(wrapper.vm.dirty).toBe(false)
      expect(at(wrapper, 'save').element.disabled).toBe(true)
    })

    it('writes every changed role with one save, and says so once', async () => {
      mocks.$apollo.mutate = jest.fn(({ variables }) =>
        Promise.resolve({
          data: {
            updateGroupRole: {
              ...ROLES.find((role) => role.name === variables.name),
              permissions: variables.permissions,
            },
          },
        }),
      )
      const wrapper = await Wrapper()
      await at(wrapper, 'switch-nonmembers-profile').setChecked(true)
      await at(wrapper, 'switch-members-comment').setChecked(true)

      await at(wrapper, 'save').trigger('click')
      await flushPromises()

      expect(mocks.$apollo.mutate.mock.calls.map(([call]) => call.variables.name)).toEqual([
        'none',
        'usual',
      ])
      expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.dirty).toBe(false)
    })

    it('keeps what was not written yet when a write is refused', async () => {
      mocks.$apollo.mutate = jest
        .fn()
        .mockResolvedValueOnce({
          data: { updateGroupRole: { ...ROLES[0], permissions: ['group.read'] } },
        })
        .mockRejectedValueOnce(new Error('refused'))
      const wrapper = await Wrapper()
      await at(wrapper, 'switch-nonmembers-profile').setChecked(true)
      await at(wrapper, 'switch-members-comment').setChecked(true)

      await at(wrapper, 'save').trigger('click')
      await flushPromises()

      expect(mocks.$toast.error).toHaveBeenCalledWith('refused')
      expect(Object.keys(wrapper.vm.drafts)).toEqual(['usual'])
    })

    it('shows no unsaved role once a template has replaced them all', async () => {
      mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { resetGroupRoles: ROLES } })
      const wrapper = await Wrapper()
      await at(wrapper, 'to-advanced').trigger('click')
      await at(wrapper, 'switch-nonmembers-profile').setChecked(true)
      expect(at(wrapper, 'role-tab-drafted-none').exists()).toBe(true)

      await at(wrapper, 'template-channel').trigger('click')
      await wrapper.vm.applyTemplateModalData.buttons.confirm.callback()
      await flushPromises()

      expect(wrapper.findAll('[data-test^="role-tab-drafted-"]')).toHaveLength(0)
    })

    it('says that a template replaces the unsaved edit too', async () => {
      const wrapper = await Wrapper()
      await at(wrapper, 'switch-members-comment').setChecked(true)

      await at(wrapper, 'template-channel').trigger('click')

      expect(wrapper.vm.applyTemplateModalData.messageIdent).toBe(
        'group.rights.confirmApplyTemplateDiscards',
      )
    })
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
    expect(at(wrapper, 'template-channel').element.disabled).toBe(true)
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

  it('says WHY a row cannot be ticked, on the row rather than in a tooltip', async () => {
    // The reason existed, but only as a `title`: invisible until somebody points a mouse at it,
    // and unreachable for a keyboard or a screen reader. The matrix has a visible note slot and
    // the network roles page was already using it.
    const wrapper = await Wrapper()
    await at(wrapper, 'to-advanced').trigger('click')
    await at(wrapper, 'role-tab-pending').trigger('click')

    const row = wrapper.find('[data-test="perm-group.leave"]').element.closest('.perm-row')

    expect(row.textContent).toContain('group.rights.mandatory')
  })

  it('blocks the applicant role nobody can reach, and says why on the tab', async () => {
    // No role grants `group.join.request` in the fixture, so nobody ever becomes an applicant.
    // Blocked rather than opening onto an explanation: the cursor is already on the tab.
    const wrapper = await Wrapper()
    await at(wrapper, 'to-advanced').trigger('click')

    const tab = at(wrapper, 'role-tab-pending')

    expect(tab.attributes('disabled')).toBeTruthy()
    // On the wrapper: a disabled button takes no pointer events, so its own title never shows.
    expect(tab.element.parentElement.getAttribute('title')).toBe('group.rights.pendingBlocked')
  })

  it('opens the applicant role again once somebody can ask to join', async () => {
    const wrapper = await Wrapper()
    wrapper.setData({
      roles: ROLES.map((role) =>
        role.name === 'none' ? { ...role, permissions: ['group.join.request'] } : role,
      ),
    })
    await wrapper.vm.$nextTick()
    await at(wrapper, 'to-advanced').trigger('click')

    expect(at(wrapper, 'role-tab-pending').attributes('disabled')).toBeFalsy()
  })

  it('stays quiet about the applicant role once somebody can ask to join', async () => {
    const wrapper = await Wrapper()
    wrapper.setData({
      roles: ROLES.map((role) =>
        role.name === 'none' ? { ...role, permissions: ['group.join.request'] } : role,
      ),
    })
    await wrapper.vm.$nextTick()
    await at(wrapper, 'to-advanced').trigger('click')
    await at(wrapper, 'role-tab-pending').trigger('click')

    expect(at(wrapper, 'pending-unreachable').exists()).toBe(false)
  })

  it('puts a whole template on the group, after asking', async () => {
    // "Turn this into a channel" used to be a button that silently took two rights off the
    // member role — a thing one could neither see beforehand nor recognise afterwards. A
    // channel is a template now: named in the question, and visible as the active tab after.
    // The mutation answers with the roles the template put on the group, which the page adopts.
    mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { resetGroupRoles: ROLES } })
    const wrapper = await Wrapper()

    await at(wrapper, 'template-channel').trigger('click')

    // Asked in a modal, not in a browser confirm box: replacing every role of a group is the
    // same weight as leaving an editor with unsaved work.
    expect(wrapper.vm.templateToApply).toBe('channel')
    expect(mocks.$apollo.mutate).not.toHaveBeenCalled()

    await wrapper.vm.applyTemplateModalData.buttons.confirm.callback()

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { groupId: 'group-1', template: 'channel' },
      }),
    )
  })

  it('shows the applied template without writing into the group it was given', async () => {
    // The group belongs to the parent page; this page holds what it just did, and takes the
    // parent's word again once the parent loads the group anew.
    mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { resetGroupRoles: ROLES } })
    const wrapper = await Wrapper()
    await at(wrapper, 'template-channel').trigger('click')
    await wrapper.vm.applyTemplateModalData.buttons.confirm.callback()

    expect(wrapper.vm.currentTemplate).toBe('channel')
    expect(wrapper.props('group').template).toBe('public')

    await wrapper.setProps({ group: { ...wrapper.props('group'), template: 'closed' } })

    expect(wrapper.vm.currentTemplate).toBe('closed')
  })

  it('names the template in the question, so the wrong one is caught before the roles are gone', async () => {
    const wrapper = await Wrapper()

    await at(wrapper, 'template-channel').trigger('click')

    expect(wrapper.vm.applyTemplateModalData.messageParams).toEqual({
      template: 'group.types.channel',
    })
  })

  it('re-applies the template the group is already on, which is what "reset" was', async () => {
    // One control instead of two. The old reset button looked its template up by the group's
    // VISIBILITY, so a group whose rights had drifted was reset to a different preset than the
    // one it came from.
    const wrapper = await Wrapper()

    await at(wrapper, 'template-public').trigger('click')

    expect(wrapper.vm.templateToApply).toBe('public')
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

    it('offers no way to add a role, because the server would refuse it', async () => {
      // Parked (#10356): a group defining its own roles has no product around it yet, and a
      // button the shield rejects is worse than no button. The five system roles are the whole
      // vocabulary for now.
      const wrapper = await advanced()

      expect(at(wrapper, 'role-add').exists()).toBe(false)
      expect(at(wrapper, 'role-create').exists()).toBe(false)
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

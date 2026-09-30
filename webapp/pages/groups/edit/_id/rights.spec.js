import { mount } from '@vue/test-utils'

import rights from './rights.vue'

const localVue = global.localVue

const CATALOG = [
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
    requiresNetworkPermission: 'videoCall.create_<type>',
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

  it('reflects what a role currently grants', async () => {
    const wrapper = await Wrapper()

    expect(at(wrapper, 'switch-members-post').element.checked).toBe(true)
    expect(at(wrapper, 'switch-members-comment').element.checked).toBe(false)
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
})

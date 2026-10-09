import { mount } from '@vue/test-utils'
import GroupMember from './GroupMember.vue'
import { removeUserFromGroupMutation } from '~/graphql/groups.js'
import { setGroupMemberRoleMutation } from '~/graphql/groupRoles.js'

const localVue = global.localVue

const propsData = {
  groupId: 'group-id',
  // The rights the row actions hang on: offering a control the backend refuses is worse than
  // not offering it, so the component asks the group what the viewer may do.
  group: {
    id: 'group-id',
    myGroupPermissions: ['group.member.role.assign', 'group.member.remove'],
  },
  // The picker offers the group's OWN roles now, so a fixture has to carry them; without them
  // it falls back to the roles the listed members happen to have.
  groupRoles: [
    { name: 'pending', label: null, system: true, protected: false, permissions: [] },
    { name: 'usual', label: null, system: true, protected: false, permissions: [] },
    { name: 'admin', label: null, system: false, protected: false, permissions: [] },
    { name: 'owner', label: null, system: true, protected: true, permissions: [] },
  ],
  groupMembers: [
    {
      user: {
        slug: 'owner',
        id: 'owner',
      },
      membership: {
        role: 'owner',
      },
    },
    {
      user: {
        slug: 'user',
        id: 'user',
      },
      membership: {
        role: 'usual',
      },
    },
  ],
}

const stubs = {
  'nuxt-link': true,
}

const apolloMock = jest
  .fn()
  .mockRejectedValueOnce({ message: 'Oh no!' })
  .mockResolvedValue({
    data: {
      setGroupMemberRole: {
        user: {
          slug: 'user',
          id: 'user',
        },
        membership: {
          role: 'admin',
        },
      },
    },
  })

const toastErrorMock = jest.fn()
const toastSuccessMock = jest.fn()

// The viewer, so their own row can be told apart — none of the fixture members by default.
const storeFor = (id = 'viewer') => ({ getters: { 'auth/user': { id } } })

describe('GroupMember', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((t) => t),
      $apollo: {
        mutate: apolloMock,
      },
      $toast: {
        error: toastErrorMock,
        success: toastSuccessMock,
      },
      $store: storeFor(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupMember, { propsData, mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-member')).toHaveLength(1)
    })

    describe('without the rights the row actions need', () => {
      // Reading the member list and acting on it are different rights. A viewer who holds one
      // without the other — a network moderator looking in, a member who may only remove —
      // must not be offered a control that would come back as "Not Authorized".
      const withRights = (permissions) =>
        mount(GroupMember, {
          propsData: { ...propsData, group: { id: 'group-id', myGroupPermissions: permissions } },
          mocks,
          localVue,
          stubs,
        })

      it('offers no role picker without group.member.role.assign', () => {
        const readOnly = withRights(['group.member.remove'])

        expect(readOnly.findAll('select')).toHaveLength(0)
        expect(readOnly.findAll('button').length).toBeGreaterThan(0)
      })

      it('offers no remove button without group.member.remove', () => {
        const noRemoval = withRights(['group.member.role.assign'])

        expect(noRemoval.findAll('select').length).toBeGreaterThan(0)
        expect(noRemoval.findAll('button')).toHaveLength(0)
      })

      it('offers neither to somebody who may only look', () => {
        const looker = withRights([])

        expect(looker.findAll('select')).toHaveLength(0)
        expect(looker.findAll('button')).toHaveLength(0)
      })
    })

    it('offers the roles the members carry when the definitions are not readable', () => {
      // members.vue passes none without group.role.manage — the picker still has to show
      // where everybody is.
      const fallback = mount(GroupMember, {
        propsData: { ...propsData, groupRoles: [] },
        mocks,
        localVue,
        stubs,
      })

      expect(fallback.vm.selectableRoles).toEqual([
        { name: 'owner', label: null },
        { name: 'usual', label: null },
      ])
    })

    describe('the viewer`s own row', () => {
      // Removing oneself is leaving: the server refuses RemoveUserFromGroup for it, and the
      // group page offers leaving as its own action.
      it('offers no remove button', () => {
        const self = mount(GroupMember, {
          propsData,
          mocks: { ...mocks, $store: storeFor('user') },
          localVue,
          stubs,
        })
        const ownRow = self.find('tbody').findAll('tr').at(1)

        expect(ownRow.findAll('button')).toHaveLength(0)
        expect(ownRow.findAll('select')).toHaveLength(1)
      })
    })

    describe('an owner row', () => {
      const withElevation = (myGroupElevation) =>
        mount(GroupMember, {
          propsData: { ...propsData, group: { ...propsData.group, myGroupElevation } },
          mocks,
          localVue,
          stubs,
        })
      const ownerRow = (wrapper) => wrapper.find('tbody').findAll('tr').at(0)

      it('is a badge for somebody who does not stand above the owner', () => {
        // Inside the group an owner has no superior: two owners are peers.
        const row = ownerRow(withElevation(null))

        expect(row.findAll('select')).toHaveLength(0)
        expect(row.findAll('button')).toHaveLength(0)
      })

      it('is actionable for a network admin whose elevation outranks every member', () => {
        const row = ownerRow(withElevation({ expiresAt: 'x', outranksMembers: true }))

        expect(row.findAll('select')).toHaveLength(1)
        expect(row.findAll('button')).toHaveLength(1)
      })

      it('stays a badge for an elevation that does not', () => {
        // A moderator's elevation: taking posts out, not standing above anybody.
        const row = ownerRow(withElevation({ expiresAt: 'x', outranksMembers: false }))

        expect(row.findAll('select')).toHaveLength(0)
      })
    })

    it('has two users in table', () => {
      expect(wrapper.find('tbody').findAll('tr')).toHaveLength(2)
    })

    it('has no modal', () => {
      expect(wrapper.find('div.os-modal-wrapper').exists()).toBe(false)
    })

    describe('change user role', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        wrapper
          .find('tbody')
          .findAll('tr')
          .at(1)
          .find('select')
          .findAll('option')
          .at(2)
          .setSelected() // fires `change` itself; a second trigger would send the mutation twice
      })

      describe('with server error', () => {
        // One test: only the first change is refused (the mock rejects once).
        it('toasts an error and puts the picker back on the role the member still holds', () => {
          expect(toastErrorMock).toHaveBeenCalledWith('Oh no!')
          expect(wrapper.find('tbody').findAll('tr').at(1).find('select').element.value).toBe(
            'usual',
          )
          expect(wrapper.emitted('loadGroupMembers')).toBeFalsy()
        })
      })

      describe('with server success', () => {
        it('calls the API', () => {
          expect(apolloMock).toHaveBeenCalledWith({
            mutation: setGroupMemberRoleMutation(),
            variables: { groupId: 'group-id', userId: 'user', roleName: 'admin' },
          })
        })

        it('toasts a success message', () => {
          expect(toastSuccessMock).toHaveBeenCalledWith('group.changeMemberRole')
        })

        it('reloads the members, so the row carries the new role', () => {
          expect(wrapper.emitted('loadGroupMembers')).toBeTruthy()
        })
      })
    })

    describe('click remove user', () => {
      beforeAll(() => {
        apolloMock.mockRejectedValueOnce({ message: 'Oh no!!' }).mockResolvedValue({
          data: {
            RemoveUserFromGroup: {
              user: {
                slug: 'user',
                id: 'user',
              },
              membership: null,
            },
          },
        })
      })

      beforeEach(() => {
        wrapper = Wrapper()
        wrapper.find('tbody').findAll('tr').at(1).find('button').trigger('click')
      })

      it('opens the modal', () => {
        expect(wrapper.find('div.os-modal-wrapper').isVisible()).toBe(true)
      })

      describe('click on cancel', () => {
        beforeEach(() => {
          wrapper
            .find('div.os-modal-wrapper')
            .find('[data-testid="os-modal-cancel"]')
            .trigger('click')
        })

        it('closes the modal', () => {
          expect(wrapper.find('div.os-modal-wrapper').exists()).toBe(false)
        })
      })

      describe('click on confirm with server error', () => {
        beforeEach(() => {
          wrapper
            .find('div.os-modal-wrapper')
            .find('[data-testid="os-modal-confirm"]')
            .trigger('click')
        })

        it('toasts an error message', () => {
          expect(toastErrorMock).toHaveBeenCalledWith('Oh no!!')
        })

        it('closes the modal', () => {
          expect(wrapper.find('div.os-modal-wrapper').exists()).toBe(false)
        })
      })

      describe('click on confirm with success', () => {
        beforeEach(() => {
          jest.clearAllMocks()
          wrapper
            .find('div.os-modal-wrapper')
            .find('[data-testid="os-modal-confirm"]')
            .trigger('click')
        })

        it('calls the API', () => {
          expect(apolloMock).toHaveBeenCalledWith({
            mutation: removeUserFromGroupMutation(),
            variables: { groupId: 'group-id', userId: 'user' },
          })
        })

        it('emits load group members', () => {
          expect(wrapper.emitted('loadGroupMembers')).toBeTruthy()
        })

        it('toasts a success message', () => {
          expect(toastSuccessMock).toHaveBeenCalledWith('group.memberRemoved')
        })

        it('closes the modal', () => {
          expect(wrapper.find('div.os-modal-wrapper').exists()).toBe(false)
        })
      })
    })
  })
})

describe('who may be put on which role', () => {
  // The server refuses both of these (groupRole/authority.ts: coverage AND dominance). Offering
  // them anyway turned a RULE into a toast that reads like a fault.
  const ROLES = [
    { name: 'usual', label: null, system: true, protected: false, permissions: ['group.read'] },
    {
      name: 'admin',
      label: null,
      system: true,
      protected: false,
      permissions: ['group.read', 'group.member.role.assign', 'group.settings.manage'],
    },
  ]

  const rowFor = (viewerPermissions, memberRole) =>
    mount(GroupMember, {
      localVue,
      stubs,
      mocks: {
        $t: (key) => key,
        $apollo: { mutate: jest.fn() },
        $toast: { error: jest.fn() },
        $store: storeFor(),
      },
      propsData: {
        ...propsData,
        group: { id: 'group-id', myGroupPermissions: viewerPermissions },
        groupRoles: ROLES,
        groupMembers: [{ user: { id: 'u2', slug: 'them' }, membership: { role: memberRole } }],
      },
    })

  const them = (role) => ({ membership: { role } })

  it('does not offer a role the viewer could not grant themselves', () => {
    const wrapper = rowFor(['group.member.role.assign', 'group.read'], 'usual')

    expect(wrapper.vm.mayAssign(them('usual'), ROLES[1])).toBe(false)
  })

  it('does not let somebody reshape a member who holds as much as they do', () => {
    const viewer = ['group.member.role.assign', 'group.read', 'group.settings.manage']
    const wrapper = rowFor(viewer, 'admin')

    expect(wrapper.vm.mayReshape(them('admin'))).toBe(false)
  })

  it('weighs the roles as the server does, not by their raw lists', () => {
    // Video calls switched off: every role still LISTS the call rights, but nobody holds them
    // here — the viewer's set is capped, and so is the server's view of each role. Comparing
    // the capped set with the raw lists locked every picker; the server's answer does not.
    const capped = (role, effectivePermissions) => ({ ...role, effectivePermissions })
    const usual = capped({ ...ROLES[0], permissions: ['group.read', 'group.videoCall.join'] }, [
      'group.read',
    ])
    const admin = capped(
      { ...ROLES[1], permissions: [...ROLES[1].permissions, 'group.videoCall.join'] },
      ROLES[1].permissions,
    )
    const viewer = [...ROLES[1].permissions, 'group.member.remove']
    const wrapper = mount(GroupMember, {
      localVue,
      stubs,
      mocks: {
        $t: (key) => key,
        $apollo: { mutate: jest.fn() },
        $toast: { error: jest.fn() },
        $store: storeFor(),
      },
      propsData: {
        ...propsData,
        group: { id: 'group-id', myGroupPermissions: viewer },
        groupRoles: [usual, admin],
        groupMembers: [{ user: { id: 'u2', slug: 'them' }, membership: { role: 'usual' } }],
      },
    })

    expect(wrapper.vm.mayAssign(them('usual'), admin)).toBe(true)
  })

  it('lets an elevated network admin reshape somebody who holds as much as they do', () => {
    const viewer = ['group.member.role.assign', 'group.read', 'group.settings.manage']
    const wrapper = mount(GroupMember, {
      localVue,
      stubs,
      mocks: {
        $t: (key) => key,
        $apollo: { mutate: jest.fn() },
        $toast: { error: jest.fn() },
        $store: storeFor(),
      },
      propsData: {
        ...propsData,
        group: {
          id: 'group-id',
          myGroupPermissions: viewer,
          myGroupElevation: { expiresAt: 'x', outranksMembers: true },
        },
        groupRoles: ROLES,
        groupMembers: [{ user: { id: 'u2', slug: 'them' }, membership: { role: 'admin' } }],
      },
    })

    expect(wrapper.vm.mayReshape(them('admin'))).toBe(true)
  })

  it('allows it where the viewer outranks the member and covers the role', () => {
    const viewer = [
      'group.member.role.assign',
      'group.read',
      'group.settings.manage',
      'group.member.remove',
    ]
    const wrapper = rowFor(viewer, 'usual')

    expect(wrapper.vm.mayAssign(them('usual'), ROLES[1])).toBe(true)
  })
})

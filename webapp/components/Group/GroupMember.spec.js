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
          .setSelected()
        wrapper.find('tbody').findAll('tr').at(1).find('select').trigger('change')
      })

      describe('with server error', () => {
        it('toasts an error message', () => {
          expect(toastErrorMock).toHaveBeenCalledWith('Oh no!')
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
      mocks: { $t: (key) => key, $apollo: { mutate: jest.fn() }, $toast: { error: jest.fn() } },
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

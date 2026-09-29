import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import GroupMember from './GroupMember.vue'
import { changeGroupMemberRoleMutation, removeUserFromGroupMutation } from '~/graphql/groups.js'

const localVue = global.localVue

// The fixture below has the viewer manage the 'user' row as the group's owner (the 'owner' row
// itself is never touched by these tests).
const store = new Vuex.Store({
  getters: {
    'auth/user': () => ({ id: 'owner' }),
  },
})

const propsData = {
  groupId: 'group-id',
  myRole: 'owner',
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
      ChangeGroupMemberRole: {
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
      return mount(GroupMember, { propsData, mocks, localVue, stubs, store })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-member')).toHaveLength(1)
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
            mutation: changeGroupMemberRoleMutation(),
            variables: { groupId: 'group-id', userId: 'user', roleInGroup: 'admin' },
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

  describe('as admin viewer — cannot touch another admin or promote to admin/owner', () => {
    const adminPropsData = {
      groupId: 'group-id',
      myRole: 'admin',
      groupMembers: [
        { user: { slug: 'owner', id: 'owner' }, membership: { role: 'owner' } },
        { user: { slug: 'admin-self', id: 'admin-self' }, membership: { role: 'admin' } },
        { user: { slug: 'other-admin', id: 'other-admin' }, membership: { role: 'admin' } },
        { user: { slug: 'usual-user', id: 'usual-user' }, membership: { role: 'usual' } },
      ],
    }
    const adminStore = new Vuex.Store({
      getters: { 'auth/user': () => ({ id: 'admin-self' }) },
    })

    const Wrapper = () =>
      mount(GroupMember, { propsData: adminPropsData, mocks, localVue, stubs, store: adminStore })

    beforeEach(() => {
      apolloMock.mockClear()
    })

    it('locks the owner row (badge, no select, no remove button)', () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(0)
      expect(row.find('select').exists()).toBe(false)
      expect(row.find('.os-badge').exists()).toBe(true)
      expect(row.find('button').exists()).toBe(false)
    })

    it("locks a fellow admin's row (badge, no select, no remove button)", () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(2)
      expect(row.find('select').exists()).toBe(false)
      expect(row.find('.os-badge').exists()).toBe(true)
      expect(row.find('button').exists()).toBe(false)
    })

    it('shows its own row as a select limited to "usual", no remove button', () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(1)
      const options = row.find('select').findAll('option')
      const disabledByRole = {}
      options.wrappers.forEach((option) => {
        disabledByRole[option.attributes('value')] = option.attributes('disabled') !== undefined
      })
      expect(disabledByRole).toEqual({
        pending: true,
        usual: false,
        admin: true,
        owner: true,
      })
      expect(row.find('button').exists()).toBe(false)
    })

    it('shows a usual member as editable between pending/usual, with admin/owner visible but disabled', () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(3)
      const options = row.find('select').findAll('option')
      const disabledByRole = {}
      options.wrappers.forEach((option) => {
        disabledByRole[option.attributes('value')] = option.attributes('disabled') !== undefined
      })
      expect(disabledByRole).toEqual({
        pending: false,
        usual: false,
        admin: true,
        owner: true,
      })
      expect(row.find('button').exists()).toBe(true)
    })

    it('opens a confirmation modal instead of submitting directly when demoting itself', async () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(1)
      row.find('select').findAll('option').at(1).setSelected()
      await row.find('select').trigger('change')

      expect(apolloMock).not.toHaveBeenCalled()
      expect(wrapper.find('div.os-modal-wrapper').exists()).toBe(true)
      expect(wrapper.vm.roleChangeModalData.titleIdent).toBe(
        'group.roleChangeModal.selfDemoteAdmin.title',
      )
    })
  })

  describe('as owner viewer — self role change confirmation', () => {
    const ownerPropsData = {
      groupId: 'group-id',
      myRole: 'owner',
      groupMembers: [
        { user: { slug: 'owner-self', id: 'owner-self' }, membership: { role: 'owner' } },
        { user: { slug: 'other-owner', id: 'other-owner' }, membership: { role: 'owner' } },
        {
          user: { slug: 'usual-user', id: 'usual-user', name: 'Usual User' },
          membership: { role: 'usual' },
        },
      ],
    }
    const ownerStore = new Vuex.Store({
      getters: { 'auth/user': () => ({ id: 'owner-self' }) },
    })

    const Wrapper = () =>
      mount(GroupMember, { propsData: ownerPropsData, mocks, localVue, stubs, store: ownerStore })

    beforeEach(() => {
      apolloMock.mockClear()
    })

    it("locks a fellow owner's row (badge, no select)", () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(1)
      expect(row.find('select').exists()).toBe(false)
      expect(row.find('.os-badge').exists()).toBe(true)
    })

    it('shows its own row as an editable select, excluding owner/pending', () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(0)
      const options = row.find('select').findAll('option')
      const disabledByRole = {}
      options.wrappers.forEach((option) => {
        disabledByRole[option.attributes('value')] = option.attributes('disabled') !== undefined
      })
      expect(disabledByRole).toEqual({
        pending: true,
        usual: false,
        admin: false,
        owner: true,
      })
    })

    it('asks for confirmation before demoting itself', async () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(0)
      row.find('select').findAll('option').at(1).setSelected()
      await row.find('select').trigger('change')

      expect(apolloMock).not.toHaveBeenCalled()
      expect(wrapper.vm.roleChangeModalData.titleIdent).toBe(
        'group.roleChangeModal.selfDemoteOwner.title',
      )
    })

    it('asks for confirmation before promoting someone else to owner', async () => {
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(2)
      row.find('select').findAll('option').at(3).setSelected()
      await row.find('select').trigger('change')

      expect(apolloMock).not.toHaveBeenCalled()
      expect(wrapper.vm.roleChangeModalData.titleIdent).toBe(
        'group.roleChangeModal.promoteToOwner.title',
      )
      expect(wrapper.vm.roleChangeModalData.messageParams).toEqual({ name: 'Usual User' })
    })

    it('commits the change once the modal is confirmed', async () => {
      jest.clearAllMocks()
      const wrapper = Wrapper()
      const row = wrapper.find('tbody').findAll('tr').at(0)
      row.find('select').findAll('option').at(1).setSelected()
      await row.find('select').trigger('change')

      await wrapper.vm.roleChangeModalData.buttons.confirm.callback()

      expect(apolloMock).toHaveBeenCalledWith({
        mutation: changeGroupMemberRoleMutation(),
        variables: { groupId: 'group-id', userId: 'owner-self', roleInGroup: 'usual' },
      })
    })
  })
})

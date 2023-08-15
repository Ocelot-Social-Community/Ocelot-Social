import { mount } from '@vue/test-utils'
import GroupMember from './GroupMember.vue'
import { changeGroupMemberRoleMutation, removeUserFromGroupMutation } from '~/graphql/groups.js'

const localVue = global.localVue

const propsData = {
  groupId: 'group-id',
  groupMembers: [
    {
      slug: 'owner',
      id: 'owner',
      myRoleInGroup: 'owner',
    },
    {
      slug: 'user',
      id: 'user',
      myRoleInGroup: 'usual',
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
        slug: 'user',
        id: 'user',
        myRoleInGroup: 'admin',
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

    it('has two users in table', () => {
      expect(wrapper.find('tbody').findAll('tr')).toHaveLength(2)
    })

    it('has no modal', () => {
      expect(wrapper.find('div.ds-modal-wrapper').exists()).toBe(false)
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
          expect(toastErrorMock).toBeCalledWith('Oh no!')
        })
      })

      describe('with server success', () => {
        it('calls the API', () => {
          expect(apolloMock).toBeCalledWith({
            mutation: changeGroupMemberRoleMutation(),
            variables: { groupId: 'group-id', userId: 'user', roleInGroup: 'admin' },
          })
        })

        it('toasts a success message', () => {
          expect(toastSuccessMock).toBeCalledWith('group.changeMemberRole')
        })
      })
    })

    describe('click remove user', () => {
      beforeAll(() => {
        apolloMock.mockRejectedValueOnce({ message: 'Oh no!!' }).mockResolvedValue({
          data: {
            RemoveUserFromGroup: {
              slug: 'user',
              id: 'user',
              myRoleInGroup: null,
            },
          },
        })
      })

      beforeEach(() => {
        wrapper = Wrapper()
        wrapper.find('tbody').findAll('tr').at(1).find('button').trigger('click')
      })

      it('opens the modal', () => {
        expect(wrapper.find('div.ds-modal-wrapper').isVisible()).toBe(true)
      })

      describe('click on cancel', () => {
        beforeEach(() => {
          wrapper.find('div.ds-modal-wrapper').find('button.ds-button-ghost').trigger('click')
        })

        it('closes the modal', () => {
          expect(wrapper.find('div.ds-modal-wrapper').exists()).toBe(false)
        })
      })

      describe('click on confirm with server error', () => {
        beforeEach(() => {
          wrapper.find('div.ds-modal-wrapper').find('button.ds-button-primary').trigger('click')
        })

        it('toasts an error message', () => {
          expect(toastErrorMock).toBeCalledWith('Oh no!!')
        })

        it('closes the modal', () => {
          expect(wrapper.find('div.ds-modal-wrapper').exists()).toBe(false)
        })
      })

      describe('click on confirm with success', () => {
        beforeEach(() => {
          jest.clearAllMocks()
          wrapper.find('div.ds-modal-wrapper').find('button.ds-button-primary').trigger('click')
        })

        it('calls the API', () => {
          expect(apolloMock).toBeCalledWith({
            mutation: removeUserFromGroupMutation(),
            variables: { groupId: 'group-id', userId: 'user' },
          })
        })

        it('emits load group members', () => {
          expect(wrapper.emitted('loadGroupMembers')).toBeTruthy()
        })

        it('toasts a success message', () => {
          expect(toastSuccessMock).toBeCalledWith('group.memberRemoved')
        })

        it('closes the modal', () => {
          expect(wrapper.find('div.ds-modal-wrapper').exists()).toBe(false)
        })
      })
    })
  })
})

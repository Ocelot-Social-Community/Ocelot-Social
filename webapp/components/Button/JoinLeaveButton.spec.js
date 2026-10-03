import { shallowMount } from '@vue/test-utils'

import Component from './JoinLeaveButton.vue'

const localVue = global.localVue

describe('JoinLeaveButton.vue', () => {
  let propsData, wrapper, mocks

  beforeEach(() => {
    propsData = {
      group: {
        id: 'g-1',
        name: 'Group 1',
        // What a stranger may do here. The button reads the rights now, not the group type:
        // `group.join` means they are in, `group.join.request` means they become an applicant,
        // neither means there is nothing to offer them.
        myGroupPermissions: ['group.read', 'group.join'],
      },
      userId: 'u1',
      isMember: false,
      isNonePendingMember: false,
    }
    mocks = {
      $t: jest.fn((t) => t),
    }
  })

  const Wrapper = () => {
    return shallowMount(Component, { propsData, localVue, mocks })
  }

  describe('shallowMount', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper).toMatchSnapshot()
    })
  })

  describe('what leaving costs, said before it happens', () => {
    // The same click means three different things. An owner may leave the group without one at
    // all, after which only a network administrator can revive it — that is not something to
    // find out afterwards.
    const messageFor = (roleName) => {
      propsData.isMember = true
      propsData.isNonePendingMember = true
      propsData.group.myGroupRole = roleName ? { name: roleName } : null
      return Wrapper().vm.leaveModalData.messageIdent
    }

    it('warns an owner that the group may be left without one', () => {
      expect(messageFor('owner')).toBe('group.leaveModal.messageOwner')
    })

    it('tells an admin they are giving the administration up', () => {
      expect(messageFor('admin')).toBe('group.leaveModal.messageAdmin')
    })

    it('says the ordinary thing to an ordinary member', () => {
      expect(messageFor('usual')).toBe('group.leaveModal.message')
      expect(messageFor(null)).toBe('group.leaveModal.message')
    })
  })

  describe('what a stranger is offered', () => {
    const labelOf = () => Wrapper().vm.label

    it('offers to join where the group lets people in', () => {
      propsData.group.myGroupPermissions = ['group.join']

      expect(labelOf()).toBe('group.joinLeaveButton.join')
    })

    it('offers to ASK where joining needs approval', () => {
      // The resolver reads the same pair to decide whether the membership lands as a member or
      // as an applicant, so the label and the outcome cannot drift apart.
      propsData.group.myGroupPermissions = ['group.join.request']

      expect(labelOf()).toBe('group.joinLeaveButton.requestJoin')
    })

    it('offers nothing at all where the group closed its door', () => {
      propsData.group.myGroupPermissions = ['group.read']

      expect(Wrapper().find('[data-test="join-leave-btn"]').exists()).toBe(false)
    })

    it('offers an applicant the door the group has since opened', () => {
      // Measured on a live instance: a public group anybody may walk into, with one person
      // still waiting from when it was closed. The floor hands them `group.join` like anyone
      // else, so the honest offer is "come in" rather than "you are waiting" — and the click
      // must not open the leave-this-group confirmation.
      propsData.group.myGroupPermissions = ['group.join']
      propsData.isMember = true
      propsData.isNonePendingMember = false
      const wrapper = Wrapper()

      expect(wrapper.vm.label).toBe('group.joinLeaveButton.join')
      expect(wrapper.vm.mayCompleteJoin).toBe(true)

      // The decision, not the request: a click must take the join path rather than open the
      // "do you want to leave this group" confirmation every other `isMember` click opens.
      wrapper.vm.joinLeave = jest.fn()
      wrapper.vm.toggle()

      expect(wrapper.vm.showConfirmModal).toBe(false)
      expect(wrapper.vm.joinLeave).toHaveBeenCalled()
    })

    it('still says "waiting" where the door stayed shut', () => {
      propsData.group.myGroupPermissions = ['group.read']
      propsData.isMember = true
      propsData.isNonePendingMember = false

      expect(Wrapper().vm.label).toBe('group.joinLeaveButton.pendingMember')
    })

    it('keeps the button for a member, whatever a stranger may do', () => {
      // Members need it to leave, and `group.leave` is what the group page disables it on.
      propsData.group.myGroupPermissions = []
      propsData.isMember = true
      propsData.isNonePendingMember = true

      expect(Wrapper().find('[data-test="join-leave-btn"]').exists()).toBe(true)
    })
  })
})

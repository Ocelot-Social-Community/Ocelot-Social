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

    it('keeps the button for a member, whatever a stranger may do', () => {
      // Members need it to leave, and `group.leave` is what the group page disables it on.
      propsData.group.myGroupPermissions = []
      propsData.isMember = true
      propsData.isNonePendingMember = true

      expect(Wrapper().find('[data-test="join-leave-btn"]').exists()).toBe(true)
    })
  })
})

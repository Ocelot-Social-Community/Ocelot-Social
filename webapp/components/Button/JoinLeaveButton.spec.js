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
})

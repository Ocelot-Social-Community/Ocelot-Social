import { mount } from '@vue/test-utils'
import GroupMember from './GroupMember.vue'

const localVue = global.localVue

const propsData = {
  groupId: '',
  groupMembers: [],
}

describe('GroupMember', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupMember, { propsData, mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-member')).toHaveLength(1)
    })
  })
})

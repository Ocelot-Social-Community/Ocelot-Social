import { mount } from '@vue/test-utils'
import GroupList from './GroupList.vue'

const localVue = global.localVue

const propsData = {
  groups: [],
}

describe('GroupList', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupList, { propsData, mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-list')).toHaveLength(1)
    })
  })
})

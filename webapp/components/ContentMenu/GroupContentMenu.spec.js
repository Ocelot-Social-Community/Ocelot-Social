import { mount } from '@vue/test-utils'
import GroupContentMenu from './GroupContentMenu.vue'

const localVue = global.localVue

const stubs = {
  'router-link': {
    template: '<span><slot /></span>',
  },
}

const propsData = {
  usage: 'groupTeaser',
  resource: {},
  group: {},
  resourceType: 'group',
}

describe('GroupContentMenu', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupContentMenu, { propsData, mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-content-menu')).toHaveLength(1)
    })
  })
})

import { mount } from '@vue/test-utils'
import GroupForm from './GroupForm.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

const propsData = {
  update: false,
  group: {},
}

describe('GroupForm', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $env: {
        CATEGORIES_ACTIVE: true,
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupForm, { propsData, mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-form')).toHaveLength(1)
    })
  })
})

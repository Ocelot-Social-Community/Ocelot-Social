import { shallowMount } from '@vue/test-utils'
import ActionRadiusSelect from './ActionRadiusSelect'

const localVue = global.localVue
const propsData = { value: 'regional' }

describe('ActionRadiusSelect.', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return shallowMount(ActionRadiusSelect, { propsData, mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })
    it('renders the select', () => {
      expect(wrapper.findComponent(ActionRadiusSelect).exists()).toBe(true)
    })

    describe('when an option is selected', () => {
      it('emits a change event with the new value', () => {
        const select = wrapper.find('select')
        select.trigger('change')
        expect(wrapper.emitted().change[0]).toEqual(['regional'])
      })
    })
  })
})

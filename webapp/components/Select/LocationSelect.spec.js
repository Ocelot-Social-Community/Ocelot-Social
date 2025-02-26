import { mount } from '@vue/test-utils'
import LocationSelect from './LocationSelect'

const localVue = global.localVue
const propsData = { value: 'nowhere' }

let wrapper

const mocks = {
  $t: jest.fn((string) => string),
  $i18n: {
    locale: () => 'en',
  },
}

describe('LocationSelect', () => {
  beforeEach(() => {
    
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(LocationSelect, { mocks, localVue, propsData })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders the label', () => {
      expect(wrapper.find('label.ds-input-label').exists()).toBe(true)
    })

    it('renders the select', () => {
      expect(wrapper.find('.ds-select').exists()).toBe(true)
    })

    it('renders the button', () => {
      expect(wrapper.find('.base-button').exists()).toBe(true)
    })

    describe('button click', () => {
      beforeEach(() => {
        wrapper.find('.base-button').trigger('click')
      })

      it('emits an empty string', () => {
        expect(wrapper.emitted().input).toBeTruthy()
        expect(wrapper.emitted().input.length).toBe(1)
        expect(wrapper.emitted().input[0]).toEqual([''])
      })
    })
  })
})
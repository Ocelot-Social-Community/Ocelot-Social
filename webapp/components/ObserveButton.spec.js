import { mount } from '@vue/test-utils'
import ObserveButton from './ObserveButton.vue'

const localVue = global.localVue

describe('ObserveButton', () => {
  let mocks

  const Wrapper = (count = 1, postId = '123', isObserved = true) => {
    return mount(ObserveButton, {
      mocks,
      localVue,
      propsData: {
        count,
        postId,
        isObserved,
      },
    })
  }

  let wrapper

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('observed', () => {
    beforeEach(() => {
      wrapper = Wrapper(1, '123', true)
    })

    it('renders', () => {
      expect(wrapper.element).toMatchSnapshot()
    })

    it('emits toggleObservePost with false when clicked', () => {
      const button = wrapper.find('.base-button')
      button.trigger('click')
      expect(wrapper.emitted('toggleObservePost')).toEqual([['123', false]])
    })
  })

  describe('unobserved', () => {
    beforeEach(() => {
      wrapper = Wrapper(1, '123', false)
    })

    it('renders', () => {
      expect(wrapper.element).toMatchSnapshot()
    })

    it('emits toggleObservePost with true when clicked', () => {
      const button = wrapper.find('.base-button')
      button.trigger('click')
      expect(wrapper.emitted('toggleObservePost')).toEqual([['123', true]])
    })
  })
})

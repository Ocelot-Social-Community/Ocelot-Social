import { render, screen, fireEvent } from '@testing-library/vue'
import ObserveButton from './ObserveButton.vue'

const localVue = global.localVue

describe('ObserveButton', () => {
  const Wrapper = (count = 1, postId = '123', isObserved = true) => {
    return render(ObserveButton, {
      mocks: {
        $t: jest.fn((t) => t),
      },
      localVue,
      propsData: {
        count,
        postId,
        isObserved,
      },
    })
  }

  describe('observed', () => {
    let wrapper

    beforeEach(() => {
      wrapper = Wrapper(1, '123', true)
    })

    it('renders', () => {
      expect(wrapper.container).toMatchSnapshot()
    })

    it('emits toggleObservePost with false when clicked', async () => {
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.emitted().toggleObservePost).toEqual([['123', false]])
    })
  })

  describe('unobserved', () => {
    let wrapper

    beforeEach(() => {
      wrapper = Wrapper(1, '123', false)
    })

    it('renders', () => {
      expect(wrapper.element).toMatchSnapshot()
    })

    it('emits toggleObservePost with true when clicked', async () => {
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.emitted().toggleObservePost).toEqual([['123', true]])
    })
  })
})

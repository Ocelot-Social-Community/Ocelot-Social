import { render, screen, fireEvent } from '@testing-library/vue'
import ActionButton from './ActionButton.vue'

const localVue = global.localVue

describe('ActionButton.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((t) => t),
    }
  })

  describe('mount', () => {
    let wrapper
    const Wrapper = () => {
      return render(ActionButton, {
        mocks,
        localVue,
        propsData: {
          icon: 'my-icon',
          text: 'Click me',
          count: 0,
          disabled: false,
          filled: false,
        },
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      const wrapper = Wrapper()
      expect(wrapper.containr).toMatchSnapshot()
    })

    it('button emits click event', async () => {
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.emitted().click).toBeTruthy()
    })
  })
})

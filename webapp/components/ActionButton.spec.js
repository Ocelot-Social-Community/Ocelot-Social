import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'
import ActionButton from './ActionButton.vue'

const localVue = global.localVue

describe('ActionButton.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((t) => t),
    }
  })

  let wrapper
  const Wrapper = ({ isDisabled = false } = {}) => {
    return render(ActionButton, {
      mocks,
      localVue,
      propsData: {
        icon: 'heart',
        text: 'Click me',
        count: 7,
        disabled: isDisabled,
      },
    })
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  describe('when not disabled', () => {
    it('renders', () => {
      const wrapper = Wrapper()
      expect(wrapper.container).toMatchSnapshot()
    })

    it('shows count', () => {
      const count = screen.getByText('7')
      expect(count).toBeInTheDocument()
    })

    it('button emits click event', async () => {
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.emitted().click).toEqual([[]])
    })
  })

  describe('when disabled', () => {
    it('renders', () => {
      const wrapper = Wrapper({ isDisabled: true })
      expect(wrapper.container).toMatchSnapshot()
    })

    it('button does not emit click event', async () => {
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.emitted().click).toEqual([[]])
    })
  })
})

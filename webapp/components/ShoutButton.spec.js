import { render, screen, fireEvent } from '@testing-library/vue'
import '@testing-library/jest-dom'
import Vue from 'vue'
import ShoutButton from './ShoutButton.vue'

const localVue = global.localVue

describe('ShoutButton.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((t) => t),
      $apollo: {
        mutate: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    let wrapper
    const Wrapper = () => {
      return render(ShoutButton, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders button and text', () => {
      expect(wrapper.container).toMatchSnapshot()
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('toggle the button', async () => {
      mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: { shout: 'WeDoShout' } })
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.container).toMatchSnapshot()
      const shoutedCount = screen.getByText('1')
      expect(shoutedCount).toBeInTheDocument()
    })

    it('toggle the button, but backend fails', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
      const button = screen.getByRole('button')
      await fireEvent.click(button)
      expect(wrapper.container).toMatchSnapshot()
      let shoutedCount = screen.getByText('1')
      expect(shoutedCount).toBeInTheDocument()
      await Vue.nextTick()
      shoutedCount = screen.getByText('0')
      expect(shoutedCount).toBeInTheDocument()
    })
  })
})

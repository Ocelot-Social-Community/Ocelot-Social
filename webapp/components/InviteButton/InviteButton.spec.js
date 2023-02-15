import { mount } from '@vue/test-utils'
import InviteButton from './InviteButton.vue'

const stubs = {
  'v-popover': true,
}

describe('InviteButton.vue', () => {
  let wrapper
  let mocks
  let propsData

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      navigator: {
        clipboard: {
          writeText: jest.fn(),
        },
      },
    }
    propsData = {}
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(InviteButton, { mocks, propsData, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.contains('.invite-button')).toBe(true)
    })

    it('open popup', () => {
      wrapper.find('.base-button').trigger('click')
      expect(wrapper.contains('.invite-button')).toBe(true)
    })

    it('invite codes not available', async () => {
      wrapper.find('.base-button').trigger('click') // open popup
      wrapper.find('.invite-button').trigger('click') // click copy button
      expect(mocks.$t).toHaveBeenCalledWith('invite-codes.not-available')
    })

    it.skip('invite codes copied to clipboard', async () => {
      wrapper.find('.base-button').trigger('click') // open popup
      wrapper.find('.invite-button').trigger('click') // click copy button
      expect(mocks.$t).toHaveBeenCalledWith('invite-codes.not-available')
    })
  })
})

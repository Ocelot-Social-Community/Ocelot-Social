import { mount } from '@vue/test-utils'
import enterNonce from './enter-nonce.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

describe('enter-nonce.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $route: {
        query: jest.fn().mockResolvedValue({ email: 'peter@lustig.de' }),
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(enterNonce, { mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-form')).toHaveLength(1)
    })
  })
})

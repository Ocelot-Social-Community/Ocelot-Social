import { config, mount } from '@vue/test-utils'
import enterNonce from './enter-nonce.vue'

const localVue = global.localVue

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

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
      return mount(enterNonce, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-form')).toHaveLength(1)
    })
  })
})
